import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/permissions/permissions.dart';
import '../../../core/permissions/permissions_store.dart';
import '../../../core/utils/network_utils.dart';
import '../../../data/models/models.dart';

abstract class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class RequestOtp extends AuthEvent {
  final String phone;
  RequestOtp(this.phone);
  @override
  List<Object?> get props => [phone];
}

class VerifyOtp extends AuthEvent {
  final String phone;
  final String otp;
  VerifyOtp(this.phone, this.otp);
  @override
  List<Object?> get props => [phone, otp];
}

class SetPin extends AuthEvent {
  final String pin;
  SetPin(this.pin);
  @override
  List<Object?> get props => [pin];
}

class LoginWithPin extends AuthEvent {
  final String phone;
  final String pin;
  LoginWithPin(this.phone, this.pin);
  @override
  List<Object?> get props => [phone, pin];
}

class EmployeeLogin extends AuthEvent {
  final String phone;
  final String pin;
  EmployeeLogin(this.phone, this.pin);
  @override
  List<Object?> get props => [phone, pin];
}

class LoadUser extends AuthEvent {}

class Logout extends AuthEvent {}

abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class OtpSent extends AuthState {
  final int resendAfter;
  OtpSent({this.resendAfter = 60});
}

class OtpVerified extends AuthState {
  final String tempToken;
  final bool isPinSet;
  final UserModel user;
  OtpVerified({required this.tempToken, required this.isPinSet, required this.user});
}

class NeedPinSetup extends AuthState {
  final String tempToken;
  final UserModel user;
  NeedPinSetup({required this.tempToken, required this.user});
}

class Authenticated extends AuthState {
  final UserModel user;
  final String? shopId;
  Authenticated({required this.user, this.shopId});
}

class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
}

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiClient apiClient;
  String? _tempToken;
  UserModel? _currentUser;
  Set<String> _permissions = {};

  AuthBloc(this.apiClient) : super(AuthInitial()) {
    on<RequestOtp>(_onRequestOtp);
    on<VerifyOtp>(_onVerifyOtp);
    on<SetPin>(_onSetPin);
    on<LoginWithPin>(_onLoginWithPin);
    on<EmployeeLogin>(_onEmployeeLogin);
    on<LoadUser>(_onLoadUser);
    on<Logout>(_onLogout);
  }

  UserModel? get currentUser => _currentUser;

  bool get isOwner => _currentUser?.isOwner ?? false;
  bool get isEmployee => _currentUser?.isEmployee ?? false;

  Set<String> get permissions => Set.unmodifiable(_permissions);

  /// Business Owners have full access; employees are checked against their
  /// permission set. This mirrors the backend `requirePermission` semantics.
  bool hasPermission(String permission) {
    final user = _currentUser;
    if (user == null) return false;
    return Permission.granted(
      role: user.role,
      permissions: _permissions,
      permission: permission,
    );
  }

  /// True when the user may open the Reports area (any report permission).
  bool get canViewReports =>
      Permission.hasAnyReport(_currentUser?.role ?? '', _permissions);

  String? get currentShopId {
    final state = this.state;
    if (state is Authenticated) return state.shopId;
    return null;
  }

  /// Derives the effective client permission set for a role.
  /// Owners bypass permissions; employees honor the explicit permission set
  /// returned by the API (which may legitimately be empty). Only when the API
  /// returns no permission list at all (e.g. a legacy endpoint) do we fall back
  /// to an empty set — this prevents employees from silently receiving full
  /// operational privileges.
  Set<String> _resolvePermissions(UserModel user, List? raw) {
    if (user.isOwner) return {};
    if (raw != null) return raw.map((e) => e.toString()).toSet();
    return {};
  }

  Future<void> _persist(UserModel user, Set<String> permissions, String? shopId) {
    return PermissionsStore.save(
      AuthProfile(user: user, permissions: permissions, shopId: shopId),
    );
  }

  Future<void> _onRequestOtp(RequestOtp event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final res = await apiClient.post('/auth/otp/request', data: {'phone': event.phone});
      emit(OtpSent(resendAfter: res['data']?['resendAfter'] ?? 60));
    } catch (e) {
      emit(AuthError(_extractError(e)));
    }
  }

  Future<void> _onVerifyOtp(VerifyOtp event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final res = await apiClient.post('/auth/otp/verify', data: {
        'phone': event.phone,
        'otp': event.otp,
      });
      final data = res['data'];
      _tempToken = data['tempToken'];
      final user = UserModel.fromJson(data['user']);
      _currentUser = user;
      _permissions = _resolvePermissions(user, null);

      if (data['isPinSet'] == true) {
        emit(Authenticated(user: user));
      } else {
        emit(NeedPinSetup(tempToken: _tempToken!, user: user));
      }
    } catch (e) {
      emit(AuthError(_extractError(e)));
    }
  }

  Future<void> _onSetPin(SetPin event, Emitter<AuthState> emit) async {
    if (_tempToken == null) {
      emit(AuthError('No temporary token'));
      return;
    }
    emit(AuthLoading());
    try {
      final res = await apiClient.post('/auth/pin/set', data: {'pin': event.pin}, token: _tempToken);
      final data = res['data'];
      await apiClient.saveToken(data['accessToken']);
      await apiClient.saveRefreshToken(data['refreshToken']);
      final user = UserModel.fromJson(data['user']);
      _currentUser = user;
      _permissions = _resolvePermissions(user, data['permissions']);
      _tempToken = null;
      await _persist(user, _permissions, data['shop']?['id']);
      emit(Authenticated(user: user, shopId: data['shop']?['id']));
    } catch (e) {
      emit(AuthError(_extractError(e)));
    }
  }

  Future<void> _onLoginWithPin(LoginWithPin event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final res = await apiClient.post('/auth/login', data: {
        'phone': event.phone,
        'pin': event.pin,
      });
      final data = res['data'];
      await apiClient.saveToken(data['accessToken']);
      await apiClient.saveRefreshToken(data['refreshToken']);
      final user = UserModel.fromJson(data['user']);
      _currentUser = user;
      _permissions = _resolvePermissions(user, data['permissions']);
      await _persist(user, _permissions, data['shop']?['id']);
      emit(Authenticated(user: user, shopId: data['shop']?['id']));
    } catch (e) {
      emit(AuthError(_extractError(e)));
    }
  }

  Future<void> _onEmployeeLogin(EmployeeLogin event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final res = await apiClient.post('/auth/employee/login', data: {
        'phone': event.phone,
        'pin': event.pin,
      });
      final data = res['data'];
      final user = UserModel.fromJson(data['user']);
      _currentUser = user;
      _permissions = _resolvePermissions(user, data['permissions']);
      if (data['requirePinChange'] == true) {
        _tempToken = data['tempToken'];
        emit(NeedPinSetup(tempToken: data['tempToken'], user: user));
      } else {
        await apiClient.saveToken(data['accessToken']);
        await apiClient.saveRefreshToken(data['refreshToken']);
        final shop = data['shop'];
        await _persist(user, _permissions, shop?['id']);
        emit(Authenticated(user: user, shopId: shop?['id']));
      }
    } catch (e) {
      emit(AuthError(_extractError(e)));
    }
  }

  Future<void> _onLoadUser(LoadUser event, Emitter<AuthState> emit) async {
    final token = await apiClient.getToken();
    if (token == null) {
      emit(AuthInitial());
      return;
    }
    try {
      final res = await apiClient.get('/users/me');
      final data = res['data'];
      final user = UserModel.fromJson(data['user']);
      _currentUser = user;
      _permissions = _resolvePermissions(user, data['permissions']);
      await _persist(user, _permissions, data['shop']?['id']);
      emit(Authenticated(user: user, shopId: data['shop']?['id']));
    } catch (e) {
      // Offline or transient failure: restore the persisted profile so the
      // client-side permission gating still applies for the session.
      final profile = await PermissionsStore.read();
      if (profile != null) {
        _currentUser = profile.user;
        _permissions = profile.permissions;
        emit(Authenticated(user: profile.user, shopId: profile.shopId));
      } else {
        emit(AuthInitial());
      }
    }
  }

  Future<void> _onLogout(Logout event, Emitter<AuthState> emit) async {
    await apiClient.clearTokens();
    await PermissionsStore.clear();
    _tempToken = null;
    _currentUser = null;
    _permissions = {};
    emit(AuthInitial());
  }

  String _extractError(dynamic e) {
    if (isOfflineError(e)) {
      return 'No network connection. Check your connection and try again.';
    }
    if (e is Map && e.containsKey('error')) {
      return e['error']?['message'] ?? 'An error occurred';
    }
    return e.toString();
  }
}
