#!/usr/bin/env bash
#
# Mwaminifu — end-to-end user pipeline verification
# System Owner -> Agent -> Business Owner -> Employee (+ soft-delete check)
#
# Usage:
#   bash backend/scripts/verify-pipeline.sh
#
# Requirements:
#   - backend running on BASE_URL (default http://127.0.0.1:5000/api/v1)
#   - psql available with DB credentials (defaults below)
#   - MOCK_SMS=true so OTP is 123456 and the temp PIN is printed to backend logs
#
set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5000/api/v1}"
PGHOST="${PGHOST:-localhost}"
PGUSER="${PGUSER:-mwaminifu_user}"
PGPASSWORD_DB="${PGPASSWORD_DB:-Mwaminifu_2026}"
PGDB="${PGDB:-mwaminifu_db}"
SYSTEM_USER="${SYSTEM_USER:-admin}"
SYSTEM_PASS="${SYSTEM_PASS:-admin123}"

export PGPASSWORD="$PGPASSWORD_DB"
PSQL="psql -h $PGHOST -U $PGUSER -d $PGDB -t -A -F|"
TS="$(date +%s)"
PH="255$(printf '%09d' $((TS % 1000000000)))"   # 12-digit unique phone
U="audit_$TS"                                    # unique agent username

pass() { echo "  ✅ PASS: $1"; }
fail() { echo "  ❌ FAIL: $1"; }
check() { if [ "$1" = "$2" ]; then pass "$3"; else fail "$3 (got '$1', want '$2')"; fi; }

jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }

echo "=================================================================="
echo " Mwaminifu pipeline verification  ($TS)"
echo "=================================================================="

# ---------- Step A: System Owner -> Agent ----------
echo
echo "[A] System Owner -> Agent"
ADMIN_TOKEN="$(curl -s -m 15 -X POST "$BASE_URL/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$SYSTEM_USER\",\"password\":\"$SYSTEM_PASS\"}" | jget "['data']['accessToken']")"
[ -n "$ADMIN_TOKEN" ] && pass "System Owner logged in" || { fail "System Owner login"; exit 1; }

AGENT_JSON="$(curl -s -m 15 -X POST "$BASE_URL/admin/agents" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$U\",\"password\":\"Passw0rd!\",\"name\":\"Audit Agent $TS\",\"phone\":\"255111$((TS%100000000))\"}")"
AGENT_ID="$(echo "$AGENT_JSON" | jget "['data']['id']")"
AGENT_CREATEDBY="$(echo "$AGENT_JSON" | jget "['data']['createdBy']")"
[ -n "$AGENT_ID" ] && pass "Agent created (id=$AGENT_ID)" || { fail "Agent creation"; exit 1; }
[ -n "$AGENT_CREATEDBY" ] && pass "Agent.createdBy set (=$AGENT_CREATEDBY)" || fail "Agent.createdBy missing"

# Verify Agent + linked AGENT User in DB
AGENT_USER_COUNT="$($PSQL -c "SELECT count(*) FROM \"User\" WHERE \"agentId\"='$AGENT_ID' AND role='AGENT';")"
check "$AGENT_USER_COUNT" "1" "Linked User row (role=AGENT) exists"

# Agent can log in
AGENT_TOKEN="$(curl -s -m 15 -X POST "$BASE_URL/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$U\",\"password\":\"Passw0rd!\"}" | jget "['data']['accessToken']")"
[ -n "$AGENT_TOKEN" ] && pass "Agent logged in" || { fail "Agent login"; exit 1; }

# Isolation: fresh agent sees zero businesses
BC="$(curl -s -m 15 "$BASE_URL/agents/businesses" -H "Authorization: Bearer $AGENT_TOKEN" | jget "['data']")"
check "$BC" "[]" "Fresh agent sees no businesses (isolation)"

# ---------- Step B: Agent -> Business Owner ----------
echo
echo "[B] Agent -> Business Owner"
BO_JSON="$(curl -s -m 15 -X POST "$BASE_URL/agents/onboard" \
  -H "Authorization: Bearer $AGENT_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PH\",\"name\":\"Audit BO $TS\",\"email\":\"auditbo@test.com\",\"shopName\":\"Audit Shop $TS\",\"shopAddress\":\"Test\"}")"
BO_ID="$(echo "$BO_JSON" | jget "['data']['user']['id']")"
SHOP_ID="$(echo "$BO_JSON" | jget "['data']['shop']['id']")"
BO_AGENTID="$(echo "$BO_JSON" | jget "['data']['user']['agentId']")"
[ -n "$BO_ID" ] && pass "Business Owner created (id=$BO_ID)" || { fail "BO creation"; exit 1; }
check "$BO_AGENTID" "$AGENT_ID" "BO.agentId links to agent"

BO_STATE="$($PSQL -c "SELECT role||'|'||CASE WHEN \"isPinSet\" THEN 't' ELSE 'f' END||'|'||CASE WHEN \"isPhoneVerified\" THEN 't' ELSE 'f' END FROM \"User\" WHERE id='$BO_ID';")"
check "$BO_STATE" "BUSINESS_OWNER|f|f" "BO user role/isPinSet/isPhoneVerified"

SHOP_STATE="$($PSQL -c "SELECT \"ownerId\"||'|'||CASE WHEN \"isArchived\" THEN 't' ELSE 'f' END FROM \"Shop\" WHERE id='$SHOP_ID';")"
check "$SHOP_STATE" "$BO_ID|f" "Shop linked to BO, not archived"

SUB="$($PSQL -c "SELECT plan||'|'||status FROM \"Subscription\" WHERE \"shopId\"='$SHOP_ID';")"
check "$SUB" "basic|active" "Subscription created (basic/active)"

CATS="$($PSQL -c "SELECT count(*) FROM \"Category\" WHERE \"shopId\"='$SHOP_ID';")"
check "$CATS" "9" "9 default categories created"

BIZ="$(curl -s -m 15 "$BASE_URL/agents/businesses" -H "Authorization: Bearer $AGENT_TOKEN" | jget "['data']")"
echo "$BIZ" | grep -q "$BO_ID" && pass "Agent 'My Businesses' includes new BO" || fail "Agent businesses list missing BO"

# OTP flow (MOCK_SMS -> OTP 123456)
OTP_REQ="$(curl -s -m 15 -X POST "$BASE_URL/auth/otp/request" -H 'Content-Type: application/json' -d "{\"phone\":\"$PH\"}" | jget "['success']")"
check "$OTP_REQ" "True" "OTP requested"
TEMP_TOKEN="$(curl -s -m 15 -X POST "$BASE_URL/auth/otp/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$PH\",\"otp\":\"123456\"}" | jget "['data']['tempToken']")"
[ -n "$TEMP_TOKEN" ] && pass "OTP 123456 verified" || fail "OTP verify"
PIN_SET="$(curl -s -m 15 -X POST "$BASE_URL/auth/pin/set" -H "Authorization: Bearer $TEMP_TOKEN" -H 'Content-Type: application/json' -d '{"pin":"123456"}' | jget "['success']")"
check "$PIN_SET" "True" "PIN set for BO"
BO_LOGIN_RESP="$(curl -s -m 15 -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' -d "{\"phone\":\"$PH\",\"pin\":\"123456\"}")"
BO_LOGIN="$(echo "$BO_LOGIN_RESP" | jget "['success']")"
check "$BO_LOGIN" "True" "BO logs in with phone+PIN"
BO_TOKEN="$(echo "$BO_LOGIN_RESP" | jget "['data']['accessToken']")"

# ---------- Step C: Business Owner -> Employee ----------
echo
echo "[C] Business Owner -> Employee"
EMP_PH="255$(printf '%09d' $(((TS+7) % 1000000000)))"
EMP_JSON="$(curl -s -m 15 -X POST "$BASE_URL/shops/$SHOP_ID/employees" \
  -H "Authorization: Bearer $BO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Audit Cashier\",\"phone\":\"$EMP_PH\",\"role\":\"Cashier\",\"permissions\":[\"pos:write\",\"inventory:read\"]}")"
EMP_USER_ID="$(echo "$EMP_JSON" | jget "['data']['userId']")"
[ -n "$EMP_USER_ID" ] && pass "Employee created" || { fail "Employee creation"; }

EMP_USER="$($PSQL -c "SELECT role FROM \"User\" WHERE id='$EMP_USER_ID';")"
check "$EMP_USER" "EMPLOYEE" "Employee User role = EMPLOYEE"
EMP_ROW="$($PSQL -c "SELECT permissions::text||'|'||CASE WHEN \"tempPinHash\" IS NULL THEN 'N' ELSE 'Y' END FROM \"Employee\" WHERE \"userId\"='$EMP_USER_ID';")"
case "$EMP_ROW" in
  '["pos:write", "inventory:read"]|Y') pass "Employee permissions + temp PIN stored" ;;
  *) fail "Employee row (got $EMP_ROW)" ;;
esac

# ---------- Step D: Soft-delete Agent (no cascade to BO) ----------
echo
echo "[D] Soft-delete Agent (cascade check)"
curl -s -m 15 -X DELETE "$BASE_URL/admin/agents/$AGENT_ID" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
AGENT_DEL="$($PSQL -c "SELECT CASE WHEN \"isActive\" THEN 't' ELSE 'f' END||'|'||CASE WHEN \"deletedAt\" IS NULL THEN 'N' ELSE 'Y' END FROM \"Agent\" WHERE id='$AGENT_ID';")"
check "$AGENT_DEL" "f|Y" "Agent soft-deleted (isActive=f, deletedAt set)"
AGENT_USER_DEL="$($PSQL -c "SELECT CASE WHEN \"isActive\" THEN 't' ELSE 'f' END||'|'||CASE WHEN \"deletedAt\" IS NULL THEN 'N' ELSE 'Y' END FROM \"User\" WHERE \"agentId\"='$AGENT_ID' AND role='AGENT';")"
check "$AGENT_USER_DEL" "f|Y" "Agent login account soft-deleted"
BO_AFTER="$($PSQL -c "SELECT CASE WHEN \"isActive\" THEN 't' ELSE 'f' END||'|'||CASE WHEN \"deletedAt\" IS NULL THEN 'N' ELSE 'Y' END FROM \"User\" WHERE id='$BO_ID';")"
check "$BO_AFTER" "t|N" "Business Owner REMAINS active (no cascade)"
SHOP_AFTER="$($PSQL -c "SELECT CASE WHEN \"isArchived\" THEN 't' ELSE 'f' END||'|'||CASE WHEN \"deletedAt\" IS NULL THEN 'N' ELSE 'Y' END FROM \"Shop\" WHERE id='$SHOP_ID';")"
check "$SHOP_AFTER" "f|N" "BO shop NOT deleted"
EMP_AFTER="$($PSQL -c "SELECT CASE WHEN \"isActive\" THEN 't' ELSE 'f' END FROM \"Employee\" WHERE \"userId\"='$EMP_USER_ID';")"
check "$EMP_AFTER" "t" "Employee NOT deleted"

echo
echo "=================================================================="
echo " Pipeline verification complete."
echo "  - Note: employee temp PIN is printed in the backend console (MOCK_SMS)."
echo "  - Test records created: agent '$U', BO '$PH', employee '$EMP_PH'."
echo "=================================================================="
