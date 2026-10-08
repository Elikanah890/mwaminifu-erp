// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Swahili (`sw`).
class AppLocalizationsSw extends AppLocalizations {
  AppLocalizationsSw([String locale = 'sw']) : super(locale);

  @override
  String get appTitle => 'Mwaminifu';

  @override
  String get businessManagement => 'Usimamizi wa Biashara';

  @override
  String get languageLabel => 'Lugha';

  @override
  String get languageKiswahili => 'Kiswahili';

  @override
  String get languageEnglish => 'English';

  @override
  String get commonSave => 'Hifadhi';

  @override
  String get commonCancel => 'Ghairi';

  @override
  String get commonDelete => 'Futa';

  @override
  String get commonConfirm => 'Thibitisha';

  @override
  String get commonEdit => 'Hariri';

  @override
  String get commonAdd => 'Ongeza';

  @override
  String get commonSearch => 'Tafuta';

  @override
  String get commonLogout => 'Toka';

  @override
  String get commonRetry => 'Jaribu tena';

  @override
  String get commonClose => 'Funga';

  @override
  String get commonBack => 'Nyuma';

  @override
  String get commonDone => 'Nimemaliza';

  @override
  String get commonRefresh => 'Sasisha';

  @override
  String get commonOptional => 'si lazima';

  @override
  String get commonAll => 'Zote';

  @override
  String get commonToday => 'Leo';

  @override
  String get commonName => 'Jina';

  @override
  String get commonPhone => 'Namba ya simu';

  @override
  String get commonAmount => 'Kiasi';

  @override
  String get commonDate => 'Tarehe';

  @override
  String get commonLoading => 'Inapakia...';

  @override
  String get commonYes => 'Ndiyo';

  @override
  String get commonNo => 'Hapana';

  @override
  String get authLogin => 'Ingia';

  @override
  String get authBusinessOwner => 'Mmiliki wa Biashara';

  @override
  String get authEmployee => 'Mfanyakazi';

  @override
  String get authPhoneNumber => 'Namba ya Simu';

  @override
  String get authPhoneHint => '255XXXXXXXXX';

  @override
  String get authPin => 'Namba ya Siri (PIN)';

  @override
  String get authPinHint => 'PIN yenye tarakimu 6';

  @override
  String get authForgotPin => 'Umesahau PIN? Pata OTP';

  @override
  String get authEnterValidPhone => 'Weka namba halali ya simu';

  @override
  String get authEnterValidPin => 'Weka PIN yenye tarakimu 6';

  @override
  String get authVerifyOtpTitle => 'Thibitisha OTP';

  @override
  String get authEnterOtp => 'Weka OTP';

  @override
  String authOtpSentTo(int minutes) {
    return 'Weka namba ya tarakimu 6 iliyotumwa kwenye simu yako. Inatumika kwa dakika $minutes.';
  }

  @override
  String get authResendOtp => 'Tuma OTP tena';

  @override
  String get authVerify => 'Thibitisha';

  @override
  String get authCreatePin => 'Tengeneza PIN';

  @override
  String get authCreatePinDesc =>
      'Tengeneza PIN yenye tarakimu 6 kwa ajili ya kuingia kila siku';

  @override
  String get authNewPin => 'PIN Mpya';

  @override
  String get authConfirmPin => 'Thibitisha PIN';

  @override
  String get authSavePin => 'Hifadhi PIN';

  @override
  String get authPinsDoNotMatch => 'PIN hazilingani';

  @override
  String authMaintenanceTitle(String appName) {
    return '$appName iko kwenye matengenezo';
  }

  @override
  String get authMaintenanceDesc =>
      'Tunafanya matengenezo yaliyopangwa. Tafadhali rudi baadaye.';

  @override
  String get authTryAgain => 'Jaribu Tena';

  @override
  String get authOtpCode => 'Namba ya OTP';

  @override
  String get authChangePin => 'Badilisha PIN';

  @override
  String get authChangePinDesc =>
      'Badilisha PIN yako ya kuingia yenye tarakimu 6.';

  @override
  String get authCurrentPin => 'PIN ya Sasa';

  @override
  String get authEnterCurrentPin => 'Weka PIN ya sasa yenye tarakimu 6';

  @override
  String get authNewPinMustDiffer => 'PIN mpya lazima itofautiane na ya sasa';

  @override
  String get authUpdatePin => 'Sasisha PIN';

  @override
  String get authPinChanged => 'PIN imebadilishwa kikamilifu';

  @override
  String get dashboardTitle => 'Dashibodi';

  @override
  String get dashboardWelcomeBack => 'Karibu tena,';

  @override
  String get dashboardTodaySales => 'Mauzo ya Leo';

  @override
  String get dashboardProfit => 'Faida';

  @override
  String get dashboardCredit => 'Deni';

  @override
  String get dashboardLowStock => 'Bidhaa Chache';

  @override
  String get dashboardItems => 'bidhaa';

  @override
  String get dashboardQuickActions => 'Vitendo vya Haraka';

  @override
  String get dashboardNewSale => 'Uza';

  @override
  String get dashboardAddProduct => 'Ongeza Bidhaa';

  @override
  String get dashboardAddExpense => 'Ongeza Matumizi';

  @override
  String get dashboardReports => 'Ripoti';

  @override
  String get dashboardRecentActivity => 'Shughuli za Hivi Karibuni';

  @override
  String get dashboardSalesToday => 'Mauzo ya leo';

  @override
  String get dashboardViewReports => 'Angalia ripoti';

  @override
  String get dashboardInventoryStatus => 'Hali ya stoo';

  @override
  String get dashboardCheckStockLevels => 'Angalia viwango vya stoo';

  @override
  String get dashboardSyncStatus => 'Hali ya usawazishaji';

  @override
  String get dashboardAllDataSynced => 'Data zote zimesawazishwa';

  @override
  String get dashboardExpensesToday => 'Matumizi ya leo';

  @override
  String get dashboardTotalCustomers => 'Wateja wote';

  @override
  String get dashboardActiveLoans => 'Mikopo hai';

  @override
  String get dashboardOutstandingCredit => 'Deni zilizobaki';

  @override
  String get dashboardSyncing => 'Inasawazisha...';

  @override
  String dashboardSyncedOffline(int count) {
    return 'Bidhaa $count za nje ya mtandao zimesawazishwa';
  }

  @override
  String dashboardPendingSync(int count) {
    return '$count zinangojea usawazishaji — angalia mtandao';
  }

  @override
  String get posTitle => 'Sehemu ya Mauzo';

  @override
  String get posCart => 'Mkokoteni';

  @override
  String get posTotal => 'Jumla';

  @override
  String get posTapProducts => 'Bonyeza bidhaa kuongeza kwenye mkokoteni';

  @override
  String get posNoProducts => 'Hakuna bidhaa';

  @override
  String get posCompleteSale => 'Kamilisha Mauzo';

  @override
  String get posSaleCompleted => 'Mauzo yamekamilika!';

  @override
  String get posNoNetwork =>
      'Hakuna mtandao — mauzo yamehifadhiwa. Yatasawazishwa mtandaoni utakapounganishwa.';

  @override
  String get posAdd => 'Ongeza';

  @override
  String get posSearchProducts => 'Tafuta bidhaa';

  @override
  String get posPaymentMethod => 'Njia ya Malipo';

  @override
  String get posCash => 'Taslimu';

  @override
  String get posMobileMoney => 'Simu (M-Pesa)';

  @override
  String get posCredit => 'Deni';

  @override
  String get posAmountPaid => 'Kiasi kilicholipwa';

  @override
  String get posChange => 'Baki';

  @override
  String get posSelectCustomer => 'Chagua Mteja';

  @override
  String get posNoCustomer => 'Bila Mteja';

  @override
  String get posNewCustomer => 'Mteja Mpya';

  @override
  String get posQuantity => 'Kiasi';

  @override
  String get posUnit => 'Kipimo';

  @override
  String get posReceipt => 'Risiti';

  @override
  String get posShareReceipt => 'Shiriki Risiti';

  @override
  String get posReprint => 'Chapisha Tena';

  @override
  String get posCustomerName => 'Jina la Mteja';

  @override
  String get posCustomerPhone => 'Simu ya Mteja';

  @override
  String get posTendered => 'Aliyolipwa';

  @override
  String get posItems => 'Bidhaa';

  @override
  String get posSubtotal => 'Jumla Ndogo';

  @override
  String get posDiscount => 'Punguzo';

  @override
  String get posGrandTotal => 'Jumla Kuu';

  @override
  String get posPayment => 'Malipo';

  @override
  String get posPaymentInsufficient => 'Malipo hayatoshi kwa jumla ya mauzo';

  @override
  String get posSaleRefunded => 'Mauzo yamerudishiwa';

  @override
  String get posSaleVoided => 'Mauzo yamefutwa';

  @override
  String get posViewHistory => 'Angalia Historia';

  @override
  String get posTransactionHistory => 'Historia ya Miamala';

  @override
  String get posNoSales => 'Hakuna mauzo bado';

  @override
  String get inventoryTitle => 'Stoo';

  @override
  String get inventorySearchProducts => 'Tafuta Bidhaa';

  @override
  String get inventorySearchHint => 'Tafuta kwa jina au SKU';

  @override
  String get inventoryNoProducts => 'Hakuna bidhaa';

  @override
  String get inventoryAddProduct => 'Ongeza Bidhaa';

  @override
  String get inventoryProductName => 'Jina la Bidhaa';

  @override
  String get inventorySku => 'SKU';

  @override
  String get inventoryCostPrice => 'Bei ya Kununua';

  @override
  String get inventorySellingPrice => 'Bei ya Kuuza';

  @override
  String get inventoryStockQty => 'Kiasi cha Stoo';

  @override
  String get inventoryReorderLevel => 'Kiwango cha Kuagiza Tena';

  @override
  String get inventorySaveProduct => 'Hifadhi Bidhaa';

  @override
  String get inventoryProductAdded => 'Bidhaa imeongezwa';

  @override
  String get inventoryProductUpdated => 'Bidhaa imesasishwa';

  @override
  String get inventoryLowStock => 'Bidhaa Chache';

  @override
  String get inventoryAdjustStock => 'Rekebisha Stoo';

  @override
  String get inventoryStockHistory => 'Historia ya Stoo';

  @override
  String get inventoryCategories => 'Makundi';

  @override
  String get inventoryCategory => 'Kundi';

  @override
  String get inventoryUnit => 'Kipimo';

  @override
  String get inventoryReceiveStock => 'Pokea Stoo';

  @override
  String get inventoryDamagedStock => 'Bidhaa Zilizoharibika';

  @override
  String get inventoryLostStock => 'Bidhaa Zilizopotea';

  @override
  String get inventoryStockValue => 'Thamani ya Stoo';

  @override
  String get inventoryEditProduct => 'Hariri Bidhaa';

  @override
  String get inventoryArchive => 'Hifadhi kwa Kumbukumbu';

  @override
  String get inventoryCurrentStock => 'Stoo ya Sasa';

  @override
  String get inventoryNewStock => 'Stoo Mpya';

  @override
  String get inventoryReason => 'Sababu';

  @override
  String get inventoryStockAdjusted => 'Stoo imerekebishwa';

  @override
  String get inventoryInStock => 'Stoo';

  @override
  String get inventoryTotalValue => 'Thamani Jumla';

  @override
  String get inventoryTotalRetailValue => 'Thamani ya Kuuza';

  @override
  String get inventoryTotalProducts => 'Bidhaa zote';

  @override
  String get inventoryFastMoving => 'Zinazokwenda Haraka';

  @override
  String get inventorySlowMoving => 'Zinazokwenda Polepole';

  @override
  String get customersTitle => 'Wateja na Deni';

  @override
  String get customersAddCustomer => 'Ongeza Mteja';

  @override
  String get customersFullName => 'Jina Kamili';

  @override
  String get customersPhone => 'Simu';

  @override
  String get customersAddress => 'Anwani';

  @override
  String get customersSaveCustomer => 'Hifadhi Mteja';

  @override
  String get customersCustomerAdded => 'Mteja ameongezwa';

  @override
  String get customersCustomerUpdated => 'Mteja amesasishwa';

  @override
  String get customersNoCustomers => 'Hakuna wateja bado';

  @override
  String customersOutstanding(String amount) {
    return 'Deni: $amount';
  }

  @override
  String get customersOutstandingBalance => 'Deni Iliyobaki';

  @override
  String get customersRecordPayment => 'Rekodi Malipo ya Deni';

  @override
  String get customersPurchaseHistory => 'Historia ya Manunuzi';

  @override
  String get customersNoPurchases => 'Hakuna manunuzi bado';

  @override
  String get customersPayment => 'Malipo';

  @override
  String get customersPaymentRecorded => 'Malipo yamerekodiwa';

  @override
  String get customersAmount => 'Kiasi';

  @override
  String get customersEditCustomer => 'Hariri Mteja';

  @override
  String get customersCreditHistory => 'Historia ya Deni';

  @override
  String get customersOverdue => 'Deni zilizochelewa';

  @override
  String customersOwes(String name, String amount) {
    return '$name anadaiwa $amount';
  }

  @override
  String get customersSearch => 'Tafuta mteja';

  @override
  String get expensesTitle => 'Matumizi';

  @override
  String get expensesAddExpense => 'Ongeza Matumizi';

  @override
  String get expensesCategory => 'Kundi';

  @override
  String get expensesAmount => 'Kiasi';

  @override
  String get expensesDescription => 'Maelezo';

  @override
  String get expensesSaveExpense => 'Hifadhi Matumizi';

  @override
  String get expensesExpenseRecorded => 'Matumizi yamerekodiwa';

  @override
  String get expensesExpenseUpdated => 'Matumizi yamesasishwa';

  @override
  String get expensesNoExpenses => 'Hakuna matumizi bado';

  @override
  String get expensesEditExpense => 'Hariri Matumizi';

  @override
  String get expensesFilter => 'Chuja';

  @override
  String get expensesTotal => 'Jumla ya Matumizi';

  @override
  String get loansTitle => 'Mikopo';

  @override
  String get loansAddLoan => 'Ongeza Mkopo';

  @override
  String get loansLender => 'Mkopaji/Mwenye Kukopesha';

  @override
  String get loansAmount => 'Kiasi';

  @override
  String get loansInterest => 'Riba %';

  @override
  String get loansDueDate => 'Tarehe ya Mwisho';

  @override
  String get loansSaveLoan => 'Hifadhi Mkopo';

  @override
  String get loansLoanCreated => 'Mkopo umeundwa';

  @override
  String get loansNoLoans => 'Hakuna mikopo bado';

  @override
  String get loansBalance => 'Salio';

  @override
  String get loansPaid => 'Imelipwa';

  @override
  String get loansActive => 'Hai';

  @override
  String get loansRecordRepayment => 'Rekodi Marejesho';

  @override
  String get loansRepaymentRecorded => 'Marejesho yamerekodiwa';

  @override
  String get loansRemaining => 'Iliyobaki';

  @override
  String get loansTotalBorrowed => 'Jumla Iliyokopwa';

  @override
  String get loansTotalOutstanding => 'Salio Zote';

  @override
  String get loansTotalRepaid => 'Jumla Iliyolipwa';

  @override
  String get employeesTitle => 'Wafanyakazi';

  @override
  String get employeesAddEmployee => 'Ongeza Mfanyakazi';

  @override
  String get employeesFullName => 'Jina Kamili';

  @override
  String get employeesPhone => 'Simu';

  @override
  String get employeesRole => 'Jukumu';

  @override
  String get employeesAdd => 'Ongeza Mfanyakazi';

  @override
  String get employeesEmployeeAdded => 'Mfanyakazi ameongezwa. SMS imetumwa.';

  @override
  String get employeesNoEmployees => 'Hakuna wafanyakazi bado';

  @override
  String get employeesOnlyOwners =>
      'Ni wamiliki wa biashara pekee wanaoweza kusimamia wafanyakazi';

  @override
  String get employeesCashier => 'Keshia';

  @override
  String get employeesShopEmployee => 'Mfanyakazi wa Duka';

  @override
  String get employeesStockClerk => 'Hifadhi ya Stoo';

  @override
  String get employeesManager => 'Meneja';

  @override
  String get employeesActive => 'Hai';

  @override
  String get employeesInactive => 'Si hai';

  @override
  String get employeesResetPin => 'Rekebisha PIN';

  @override
  String get employeesRemove => 'Ondoa';

  @override
  String get employeesActivity => 'Shughuli za Mfanyakazi';

  @override
  String get reportsTitle => 'Ripoti';

  @override
  String get reportsSalesReport => 'Ripoti ya Mauzo';

  @override
  String get reportsInventoryValuation => 'Thamani ya Stoo';

  @override
  String get reportsProfitReport => 'Ripoti ya Faida';

  @override
  String get reportsExpenseReport => 'Ripoti ya Matumizi';

  @override
  String get reportsCreditReport => 'Ripoti ya Deni';

  @override
  String get reportsLoanReport => 'Ripoti ya Mikopo';

  @override
  String get reportsCashflowReport => 'Mtiririko wa Fedha';

  @override
  String get reportsEmployeeReport => 'Ripoti ya Wafanyakazi';

  @override
  String get reportsPaymentMethodsReport => 'Njia za Malipo';

  @override
  String get reportsTotalSales => 'Mauzo Jumla';

  @override
  String get reportsTransactions => 'Miamala';

  @override
  String get reportsTotalItems => 'Bidhaa Jumla';

  @override
  String get reportsAvgTicket => 'Wastani wa Tiketi';

  @override
  String get reportsRecentSales => 'Mauzo ya Hivi Karibuni';

  @override
  String get reportsAvailableReports => 'Ripoti Zinazopatikana';

  @override
  String get reportsThisMonth => 'Mwezi Huu';

  @override
  String get reportsDaily => 'Kila Siku';

  @override
  String get reportsWeekly => 'Kila Wiki';

  @override
  String get reportsMonthly => 'Kila Mwezi';

  @override
  String get reportsYearly => 'Kila Mwaka';

  @override
  String get reportsCustom => 'Muda Maalum';

  @override
  String get reportsToday => 'Leo';

  @override
  String get reportsYesterday => 'Jana';

  @override
  String get reportsThisWeek => 'Wiki Hii';

  @override
  String get reportsPreviousWeek => 'Wiki Iliyopita';

  @override
  String get reportsFrom => 'Kutoka';

  @override
  String get reportsTo => 'Mpaka';

  @override
  String get reportsSelectPeriod => 'Chagua Muda';

  @override
  String get reportsTotalRevenue => 'Mapato Jumla';

  @override
  String get reportsTotalDiscounts => 'Punguzo Jumla';

  @override
  String get reportsTotalExpenses => 'Matumizi Jumla';

  @override
  String get reportsEstimatedProfit => 'Faida Kadiriwa';

  @override
  String get reportsByCategory => 'Kwa Kundi';

  @override
  String get reportsTotalValue => 'Thamani Jumla';

  @override
  String get reportsTotalRetailValue => 'Thamani ya Kuuza';

  @override
  String get reportsTotalProducts => 'Bidhaa Jumla';

  @override
  String get reportsTotalOutstanding => 'Deni Jumla';

  @override
  String get reportsCustomersWithDebt => 'Wateja wenye Deni';

  @override
  String get reportsTotalBorrowed => 'Jumla Iliyokopwa';

  @override
  String get reportsTotalRepaid => 'Jumla Iliyolipwa';

  @override
  String get reportsNetCashFlow => 'Mtiririko Halisi wa Fedha';

  @override
  String get reportsTotalInflow => 'Mapato Jumla';

  @override
  String get reportsTotalOutflow => 'Matumizi Jumla';

  @override
  String get reportsCreditCollections => 'Malipo ya Deni';

  @override
  String get reportsNoData => 'Hakuna data kwa muda uliochaguliwa';

  @override
  String get reportsLoadError => 'Imeshindwa kupakia ripoti';

  @override
  String get moreTitle => 'Zaidi';

  @override
  String get moreBusiness => 'Biashara';

  @override
  String get moreFinancial => 'Fedha';

  @override
  String get moreSystem => 'Mfumo';

  @override
  String get moreAccount => 'Akaunti';

  @override
  String get moreEmployees => 'Wafanyakazi';

  @override
  String get moreReceiptSettings => 'Mipangilio ya Risiti';

  @override
  String get moreExpenses => 'Matumizi';

  @override
  String get moreCustomersCredit => 'Wateja na Deni';

  @override
  String get moreLoans => 'Mikopo';

  @override
  String get moreSyncStatus => 'Hali ya Usawazishaji';

  @override
  String get moreBackup => 'Hifadhi Nakala';

  @override
  String get moreChangePin => 'Badilisha PIN';

  @override
  String get moreAbout => 'Kuhusu';

  @override
  String get moreLogout => 'Toka';

  @override
  String moreLoggedInAs(String name) {
    return 'Umeingia kama $name';
  }

  @override
  String get moreShops => 'Maduka';

  @override
  String get moreManageShops => 'Simamia Maduka';

  @override
  String get moreBusinessSettings => 'Mipangilio ya Biashara';

  @override
  String get moreNotifications => 'Arifa';

  @override
  String get moreSupport => 'Msaada';

  @override
  String get moreLanguage => 'Lugha';

  @override
  String get moreSyncNow => 'Sasisha Sasa';

  @override
  String get morePendingOffline => 'Zinangojea nje ya mtandao';

  @override
  String get moreLastPull => 'Usawazishaji wa mwisho';

  @override
  String get moreLastPush => 'Usafirishaji wa mwisho';

  @override
  String get moreComingSoon => 'Inakuja hivi karibuni';

  @override
  String moreSyncedCount(int pushed, int failed) {
    return '$pushed bidhaa zimesawazishwa. $failed hazikufanikiwa.';
  }

  @override
  String moreSyncFailed(int pending) {
    return 'Usawazishaji umeshindikana: $pending zinangojea';
  }

  @override
  String get moreNoShop => 'Hakuna duka linalopatikana';

  @override
  String get moreCouldNotReachSync =>
      'Imeshindwa kufikia huduma ya usawazishaji';

  @override
  String get shopTitle => 'Maduka';

  @override
  String get shopAddShop => 'Ongeza Duka';

  @override
  String get shopName => 'Jina la Duka';

  @override
  String get shopAddress => 'Anwani';

  @override
  String get shopCurrency => 'Sarafu';

  @override
  String get shopSaveShop => 'Hifadhi Duka';

  @override
  String get shopShopCreated => 'Duka limeundwa';

  @override
  String get shopShopUpdated => 'Duka limesasishwa';

  @override
  String get shopArchive => 'Hifadhi kwa Kumbukumbu';

  @override
  String get shopNoShops => 'Hakuna maduka';

  @override
  String get shopSwitchShop => 'Badilisha Duka';

  @override
  String get shopAllShops => 'Maduka Yote';

  @override
  String get shopActive => 'Hai';

  @override
  String get shopArchived => 'Imehifadhiwa';

  @override
  String get shopSelectShop => 'Chagua Duka';

  @override
  String get shopCurrent => 'Duka la Sasa';

  @override
  String get notificationsTitle => 'Arifa';

  @override
  String get notificationsNoNotifications => 'Hakuna arifa';

  @override
  String get notificationsMarkAllRead => 'Weka zote kama zimesomwa';

  @override
  String get notificationsMarkRead => 'Weka kama imesomwa';

  @override
  String get supportTitle => 'Msaada';

  @override
  String get supportContact => 'Mawasiliano ya Msaada';

  @override
  String get supportDescription =>
      'Kwa usaidizi, tafadhali wasiliana nasi kupitia:';

  @override
  String get supportEmail => 'Barua pepe';

  @override
  String get supportPhone => 'Simu';

  @override
  String get supportNoContact => 'Hakuna mawasiliano ya msaada yaliyopangwa';

  @override
  String get profileTitle => 'Wasifu';

  @override
  String get profileEdit => 'Hariri Wasifu';

  @override
  String get profileName => 'Jina';

  @override
  String get profileRole => 'Jukumu';

  @override
  String get profileUpdated => 'Wasifu umesasishwa';

  @override
  String get errorGeneric => 'Hitilafu imetokea. Tafadhali jaribu tena.';

  @override
  String get errorNetwork => 'Hakuna muunganisho wa mtandao.';

  @override
  String get errorUnauthorized => 'Hujaruhusiwa kufanya kitendo hiki.';

  @override
  String get errorForbidden => 'Huna ruhusa ya kufanya kitendo hiki.';

  @override
  String get errorNotFound => 'Hakuna kilichopatikana.';

  @override
  String get errorValidation => 'Tafadhali angalia taarifa ulizoingiza.';

  @override
  String get errorStockNegative => 'Stoo haiwezi kuwa chini ya sifuri';

  @override
  String get errorInsufficientStock => 'Stoo haitoshi';

  @override
  String get supportMyTickets => 'Tiketi Zangu za Msaada';

  @override
  String get supportNoTickets => 'Hakuna tiketi bado';

  @override
  String get supportNewTicket => 'Tiketi Mpya';

  @override
  String get supportSubject => 'Mada';

  @override
  String get supportMessage => 'Ujumbe';

  @override
  String get supportPriority => 'Kipaumbele';

  @override
  String get supportSubmit => 'Tuma';

  @override
  String get supportTicketCreated => 'Tiketi imetumwa';

  @override
  String get supportReply => 'Jibu';

  @override
  String get supportReplies => 'Majibu';

  @override
  String get supportStatus => 'Hali';

  @override
  String get supportStatusOpen => 'Wazi';

  @override
  String get supportStatusResolved => 'Tatuliwa';

  @override
  String get supportStatusClosed => 'Imefungwa';

  @override
  String get supportSendReply => 'Tuma jibu';

  @override
  String get supportTypeReply => 'Andika jibu...';

  @override
  String get receiptTitle => 'Mipangilio ya Stakabadhi';

  @override
  String get receiptHeader => 'Kichwa cha stakabadhi';

  @override
  String get receiptFooter => 'Mwisho wa stakabadhi';

  @override
  String get receiptTaxNumber => 'Namba ya kodi (TIN)';

  @override
  String get receiptCurrency => 'Sarafu';

  @override
  String get receiptLanguage => 'Lugha';

  @override
  String get receiptPrinter => 'Kichapishaji';

  @override
  String get receiptPrinterType => 'Aina ya kichapishaji';

  @override
  String get receiptPrinterBluetooth => 'Bluetooth';

  @override
  String get receiptPrinterNone => 'Hakuna';

  @override
  String get receiptUpdated => 'Mipangilio imehifadhiwa';

  @override
  String get receiptLoadError => 'Imeshindikana kupakia mipangilio';

  @override
  String get reportsExport => 'Hamisha';

  @override
  String get reportsExportPdf => 'PDF';

  @override
  String get reportsExportExcel => 'Excel';

  @override
  String get reportsExportCsv => 'CSV';

  @override
  String get reportsExporting => 'Inatayarisha faili...';

  @override
  String get reportsExportSuccess => 'Ripoti imepakuliwa';

  @override
  String get reportsExportError => 'Imeshindikana kuhamisha ripoti';

  @override
  String get reportsChooseFormat => 'Chagua muundo wa faili';
}
