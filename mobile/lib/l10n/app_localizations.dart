import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_sw.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('sw'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In sw, this message translates to:
  /// **'Mwaminifu'**
  String get appTitle;

  /// No description provided for @businessManagement.
  ///
  /// In sw, this message translates to:
  /// **'Usimamizi wa Biashara'**
  String get businessManagement;

  /// No description provided for @languageLabel.
  ///
  /// In sw, this message translates to:
  /// **'Lugha'**
  String get languageLabel;

  /// No description provided for @languageKiswahili.
  ///
  /// In sw, this message translates to:
  /// **'Kiswahili'**
  String get languageKiswahili;

  /// No description provided for @languageEnglish.
  ///
  /// In sw, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @commonSave.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi'**
  String get commonSave;

  /// No description provided for @commonCancel.
  ///
  /// In sw, this message translates to:
  /// **'Ghairi'**
  String get commonCancel;

  /// No description provided for @commonDelete.
  ///
  /// In sw, this message translates to:
  /// **'Futa'**
  String get commonDelete;

  /// No description provided for @commonConfirm.
  ///
  /// In sw, this message translates to:
  /// **'Thibitisha'**
  String get commonConfirm;

  /// No description provided for @commonEdit.
  ///
  /// In sw, this message translates to:
  /// **'Hariri'**
  String get commonEdit;

  /// No description provided for @commonAdd.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza'**
  String get commonAdd;

  /// No description provided for @commonSearch.
  ///
  /// In sw, this message translates to:
  /// **'Tafuta'**
  String get commonSearch;

  /// No description provided for @commonLogout.
  ///
  /// In sw, this message translates to:
  /// **'Toka'**
  String get commonLogout;

  /// No description provided for @commonRetry.
  ///
  /// In sw, this message translates to:
  /// **'Jaribu tena'**
  String get commonRetry;

  /// No description provided for @commonClose.
  ///
  /// In sw, this message translates to:
  /// **'Funga'**
  String get commonClose;

  /// No description provided for @commonBack.
  ///
  /// In sw, this message translates to:
  /// **'Nyuma'**
  String get commonBack;

  /// No description provided for @commonDone.
  ///
  /// In sw, this message translates to:
  /// **'Nimemaliza'**
  String get commonDone;

  /// No description provided for @commonRefresh.
  ///
  /// In sw, this message translates to:
  /// **'Sasisha'**
  String get commonRefresh;

  /// No description provided for @commonOptional.
  ///
  /// In sw, this message translates to:
  /// **'si lazima'**
  String get commonOptional;

  /// No description provided for @commonAll.
  ///
  /// In sw, this message translates to:
  /// **'Zote'**
  String get commonAll;

  /// No description provided for @commonToday.
  ///
  /// In sw, this message translates to:
  /// **'Leo'**
  String get commonToday;

  /// No description provided for @commonName.
  ///
  /// In sw, this message translates to:
  /// **'Jina'**
  String get commonName;

  /// No description provided for @commonPhone.
  ///
  /// In sw, this message translates to:
  /// **'Namba ya simu'**
  String get commonPhone;

  /// No description provided for @commonAmount.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi'**
  String get commonAmount;

  /// No description provided for @commonDate.
  ///
  /// In sw, this message translates to:
  /// **'Tarehe'**
  String get commonDate;

  /// No description provided for @commonLoading.
  ///
  /// In sw, this message translates to:
  /// **'Inapakia...'**
  String get commonLoading;

  /// No description provided for @commonYes.
  ///
  /// In sw, this message translates to:
  /// **'Ndiyo'**
  String get commonYes;

  /// No description provided for @commonNo.
  ///
  /// In sw, this message translates to:
  /// **'Hapana'**
  String get commonNo;

  /// No description provided for @authLogin.
  ///
  /// In sw, this message translates to:
  /// **'Ingia'**
  String get authLogin;

  /// No description provided for @authBusinessOwner.
  ///
  /// In sw, this message translates to:
  /// **'Mmiliki wa Biashara'**
  String get authBusinessOwner;

  /// No description provided for @authEmployee.
  ///
  /// In sw, this message translates to:
  /// **'Mfanyakazi'**
  String get authEmployee;

  /// No description provided for @authPhoneNumber.
  ///
  /// In sw, this message translates to:
  /// **'Namba ya Simu'**
  String get authPhoneNumber;

  /// No description provided for @authPhoneHint.
  ///
  /// In sw, this message translates to:
  /// **'255XXXXXXXXX'**
  String get authPhoneHint;

  /// No description provided for @authPin.
  ///
  /// In sw, this message translates to:
  /// **'Namba ya Siri (PIN)'**
  String get authPin;

  /// No description provided for @authPinHint.
  ///
  /// In sw, this message translates to:
  /// **'PIN yenye tarakimu 6'**
  String get authPinHint;

  /// No description provided for @authForgotPin.
  ///
  /// In sw, this message translates to:
  /// **'Umesahau PIN? Pata OTP'**
  String get authForgotPin;

  /// No description provided for @authEnterValidPhone.
  ///
  /// In sw, this message translates to:
  /// **'Weka namba halali ya simu'**
  String get authEnterValidPhone;

  /// No description provided for @authEnterValidPin.
  ///
  /// In sw, this message translates to:
  /// **'Weka PIN yenye tarakimu 6'**
  String get authEnterValidPin;

  /// No description provided for @authVerifyOtpTitle.
  ///
  /// In sw, this message translates to:
  /// **'Thibitisha OTP'**
  String get authVerifyOtpTitle;

  /// No description provided for @authEnterOtp.
  ///
  /// In sw, this message translates to:
  /// **'Weka OTP'**
  String get authEnterOtp;

  /// No description provided for @authOtpSentTo.
  ///
  /// In sw, this message translates to:
  /// **'Weka namba ya tarakimu 6 iliyotumwa kwenye simu yako. Inatumika kwa dakika {minutes}.'**
  String authOtpSentTo(int minutes);

  /// No description provided for @authResendOtp.
  ///
  /// In sw, this message translates to:
  /// **'Tuma OTP tena'**
  String get authResendOtp;

  /// No description provided for @authVerify.
  ///
  /// In sw, this message translates to:
  /// **'Thibitisha'**
  String get authVerify;

  /// No description provided for @authCreatePin.
  ///
  /// In sw, this message translates to:
  /// **'Tengeneza PIN'**
  String get authCreatePin;

  /// No description provided for @authCreatePinDesc.
  ///
  /// In sw, this message translates to:
  /// **'Tengeneza PIN yenye tarakimu 6 kwa ajili ya kuingia kila siku'**
  String get authCreatePinDesc;

  /// No description provided for @authNewPin.
  ///
  /// In sw, this message translates to:
  /// **'PIN Mpya'**
  String get authNewPin;

  /// No description provided for @authConfirmPin.
  ///
  /// In sw, this message translates to:
  /// **'Thibitisha PIN'**
  String get authConfirmPin;

  /// No description provided for @authSavePin.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi PIN'**
  String get authSavePin;

  /// No description provided for @authPinsDoNotMatch.
  ///
  /// In sw, this message translates to:
  /// **'PIN hazilingani'**
  String get authPinsDoNotMatch;

  /// No description provided for @authMaintenanceTitle.
  ///
  /// In sw, this message translates to:
  /// **'{appName} iko kwenye matengenezo'**
  String authMaintenanceTitle(String appName);

  /// No description provided for @authMaintenanceDesc.
  ///
  /// In sw, this message translates to:
  /// **'Tunafanya matengenezo yaliyopangwa. Tafadhali rudi baadaye.'**
  String get authMaintenanceDesc;

  /// No description provided for @authTryAgain.
  ///
  /// In sw, this message translates to:
  /// **'Jaribu Tena'**
  String get authTryAgain;

  /// No description provided for @authOtpCode.
  ///
  /// In sw, this message translates to:
  /// **'Namba ya OTP'**
  String get authOtpCode;

  /// No description provided for @authChangePin.
  ///
  /// In sw, this message translates to:
  /// **'Badilisha PIN'**
  String get authChangePin;

  /// No description provided for @authChangePinDesc.
  ///
  /// In sw, this message translates to:
  /// **'Badilisha PIN yako ya kuingia yenye tarakimu 6.'**
  String get authChangePinDesc;

  /// No description provided for @authCurrentPin.
  ///
  /// In sw, this message translates to:
  /// **'PIN ya Sasa'**
  String get authCurrentPin;

  /// No description provided for @authEnterCurrentPin.
  ///
  /// In sw, this message translates to:
  /// **'Weka PIN ya sasa yenye tarakimu 6'**
  String get authEnterCurrentPin;

  /// No description provided for @authNewPinMustDiffer.
  ///
  /// In sw, this message translates to:
  /// **'PIN mpya lazima itofautiane na ya sasa'**
  String get authNewPinMustDiffer;

  /// No description provided for @authUpdatePin.
  ///
  /// In sw, this message translates to:
  /// **'Sasisha PIN'**
  String get authUpdatePin;

  /// No description provided for @authPinChanged.
  ///
  /// In sw, this message translates to:
  /// **'PIN imebadilishwa kikamilifu'**
  String get authPinChanged;

  /// No description provided for @dashboardTitle.
  ///
  /// In sw, this message translates to:
  /// **'Dashibodi'**
  String get dashboardTitle;

  /// No description provided for @dashboardWelcomeBack.
  ///
  /// In sw, this message translates to:
  /// **'Karibu tena,'**
  String get dashboardWelcomeBack;

  /// No description provided for @dashboardTodaySales.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo ya Leo'**
  String get dashboardTodaySales;

  /// No description provided for @dashboardProfit.
  ///
  /// In sw, this message translates to:
  /// **'Faida'**
  String get dashboardProfit;

  /// No description provided for @dashboardCredit.
  ///
  /// In sw, this message translates to:
  /// **'Deni'**
  String get dashboardCredit;

  /// No description provided for @dashboardLowStock.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa Chache'**
  String get dashboardLowStock;

  /// No description provided for @dashboardItems.
  ///
  /// In sw, this message translates to:
  /// **'bidhaa'**
  String get dashboardItems;

  /// No description provided for @dashboardQuickActions.
  ///
  /// In sw, this message translates to:
  /// **'Vitendo vya Haraka'**
  String get dashboardQuickActions;

  /// No description provided for @dashboardNewSale.
  ///
  /// In sw, this message translates to:
  /// **'Uza'**
  String get dashboardNewSale;

  /// No description provided for @dashboardAddProduct.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Bidhaa'**
  String get dashboardAddProduct;

  /// No description provided for @dashboardAddExpense.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Matumizi'**
  String get dashboardAddExpense;

  /// No description provided for @dashboardReports.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti'**
  String get dashboardReports;

  /// No description provided for @dashboardRecentActivity.
  ///
  /// In sw, this message translates to:
  /// **'Shughuli za Hivi Karibuni'**
  String get dashboardRecentActivity;

  /// No description provided for @dashboardSalesToday.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo ya leo'**
  String get dashboardSalesToday;

  /// No description provided for @dashboardViewReports.
  ///
  /// In sw, this message translates to:
  /// **'Angalia ripoti'**
  String get dashboardViewReports;

  /// No description provided for @dashboardInventoryStatus.
  ///
  /// In sw, this message translates to:
  /// **'Hali ya stoo'**
  String get dashboardInventoryStatus;

  /// No description provided for @dashboardCheckStockLevels.
  ///
  /// In sw, this message translates to:
  /// **'Angalia viwango vya stoo'**
  String get dashboardCheckStockLevels;

  /// No description provided for @dashboardSyncStatus.
  ///
  /// In sw, this message translates to:
  /// **'Hali ya usawazishaji'**
  String get dashboardSyncStatus;

  /// No description provided for @dashboardAllDataSynced.
  ///
  /// In sw, this message translates to:
  /// **'Data zote zimesawazishwa'**
  String get dashboardAllDataSynced;

  /// No description provided for @dashboardExpensesToday.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi ya leo'**
  String get dashboardExpensesToday;

  /// No description provided for @dashboardTotalCustomers.
  ///
  /// In sw, this message translates to:
  /// **'Wateja wote'**
  String get dashboardTotalCustomers;

  /// No description provided for @dashboardActiveLoans.
  ///
  /// In sw, this message translates to:
  /// **'Mikopo hai'**
  String get dashboardActiveLoans;

  /// No description provided for @dashboardOutstandingCredit.
  ///
  /// In sw, this message translates to:
  /// **'Deni zilizobaki'**
  String get dashboardOutstandingCredit;

  /// No description provided for @dashboardSyncing.
  ///
  /// In sw, this message translates to:
  /// **'Inasawazisha...'**
  String get dashboardSyncing;

  /// No description provided for @dashboardSyncedOffline.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa {count} za nje ya mtandao zimesawazishwa'**
  String dashboardSyncedOffline(int count);

  /// No description provided for @dashboardPendingSync.
  ///
  /// In sw, this message translates to:
  /// **'{count} zinangojea usawazishaji — angalia mtandao'**
  String dashboardPendingSync(int count);

  /// No description provided for @posTitle.
  ///
  /// In sw, this message translates to:
  /// **'Sehemu ya Mauzo'**
  String get posTitle;

  /// No description provided for @posCart.
  ///
  /// In sw, this message translates to:
  /// **'Mkokoteni'**
  String get posCart;

  /// No description provided for @posTotal.
  ///
  /// In sw, this message translates to:
  /// **'Jumla'**
  String get posTotal;

  /// No description provided for @posTapProducts.
  ///
  /// In sw, this message translates to:
  /// **'Bonyeza bidhaa kuongeza kwenye mkokoteni'**
  String get posTapProducts;

  /// No description provided for @posNoProducts.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna bidhaa'**
  String get posNoProducts;

  /// No description provided for @posCompleteSale.
  ///
  /// In sw, this message translates to:
  /// **'Kamilisha Mauzo'**
  String get posCompleteSale;

  /// No description provided for @posSaleCompleted.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo yamekamilika!'**
  String get posSaleCompleted;

  /// No description provided for @posNoNetwork.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna mtandao — mauzo yamehifadhiwa. Yatasawazishwa mtandaoni utakapounganishwa.'**
  String get posNoNetwork;

  /// No description provided for @posAdd.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza'**
  String get posAdd;

  /// No description provided for @posSearchProducts.
  ///
  /// In sw, this message translates to:
  /// **'Tafuta bidhaa'**
  String get posSearchProducts;

  /// No description provided for @posPaymentMethod.
  ///
  /// In sw, this message translates to:
  /// **'Njia ya Malipo'**
  String get posPaymentMethod;

  /// No description provided for @posCash.
  ///
  /// In sw, this message translates to:
  /// **'Taslimu'**
  String get posCash;

  /// No description provided for @posMobileMoney.
  ///
  /// In sw, this message translates to:
  /// **'Simu (M-Pesa)'**
  String get posMobileMoney;

  /// No description provided for @posCredit.
  ///
  /// In sw, this message translates to:
  /// **'Deni'**
  String get posCredit;

  /// No description provided for @posAmountPaid.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi kilicholipwa'**
  String get posAmountPaid;

  /// No description provided for @posChange.
  ///
  /// In sw, this message translates to:
  /// **'Baki'**
  String get posChange;

  /// No description provided for @posSelectCustomer.
  ///
  /// In sw, this message translates to:
  /// **'Chagua Mteja'**
  String get posSelectCustomer;

  /// No description provided for @posNoCustomer.
  ///
  /// In sw, this message translates to:
  /// **'Bila Mteja'**
  String get posNoCustomer;

  /// No description provided for @posNewCustomer.
  ///
  /// In sw, this message translates to:
  /// **'Mteja Mpya'**
  String get posNewCustomer;

  /// No description provided for @posQuantity.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi'**
  String get posQuantity;

  /// No description provided for @posUnit.
  ///
  /// In sw, this message translates to:
  /// **'Kipimo'**
  String get posUnit;

  /// No description provided for @posReceipt.
  ///
  /// In sw, this message translates to:
  /// **'Risiti'**
  String get posReceipt;

  /// No description provided for @posShareReceipt.
  ///
  /// In sw, this message translates to:
  /// **'Shiriki Risiti'**
  String get posShareReceipt;

  /// No description provided for @posReprint.
  ///
  /// In sw, this message translates to:
  /// **'Chapisha Tena'**
  String get posReprint;

  /// No description provided for @posCustomerName.
  ///
  /// In sw, this message translates to:
  /// **'Jina la Mteja'**
  String get posCustomerName;

  /// No description provided for @posCustomerPhone.
  ///
  /// In sw, this message translates to:
  /// **'Simu ya Mteja'**
  String get posCustomerPhone;

  /// No description provided for @posTendered.
  ///
  /// In sw, this message translates to:
  /// **'Aliyolipwa'**
  String get posTendered;

  /// No description provided for @posItems.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa'**
  String get posItems;

  /// No description provided for @posSubtotal.
  ///
  /// In sw, this message translates to:
  /// **'Jumla Ndogo'**
  String get posSubtotal;

  /// No description provided for @posDiscount.
  ///
  /// In sw, this message translates to:
  /// **'Punguzo'**
  String get posDiscount;

  /// No description provided for @posGrandTotal.
  ///
  /// In sw, this message translates to:
  /// **'Jumla Kuu'**
  String get posGrandTotal;

  /// No description provided for @posPayment.
  ///
  /// In sw, this message translates to:
  /// **'Malipo'**
  String get posPayment;

  /// No description provided for @posPaymentInsufficient.
  ///
  /// In sw, this message translates to:
  /// **'Malipo hayatoshi kwa jumla ya mauzo'**
  String get posPaymentInsufficient;

  /// No description provided for @posSaleRefunded.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo yamerudishiwa'**
  String get posSaleRefunded;

  /// No description provided for @posSaleVoided.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo yamefutwa'**
  String get posSaleVoided;

  /// No description provided for @posViewHistory.
  ///
  /// In sw, this message translates to:
  /// **'Angalia Historia'**
  String get posViewHistory;

  /// No description provided for @posTransactionHistory.
  ///
  /// In sw, this message translates to:
  /// **'Historia ya Miamala'**
  String get posTransactionHistory;

  /// No description provided for @posNoSales.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna mauzo bado'**
  String get posNoSales;

  /// No description provided for @inventoryTitle.
  ///
  /// In sw, this message translates to:
  /// **'Stoo'**
  String get inventoryTitle;

  /// No description provided for @inventorySearchProducts.
  ///
  /// In sw, this message translates to:
  /// **'Tafuta Bidhaa'**
  String get inventorySearchProducts;

  /// No description provided for @inventorySearchHint.
  ///
  /// In sw, this message translates to:
  /// **'Tafuta kwa jina au SKU'**
  String get inventorySearchHint;

  /// No description provided for @inventoryNoProducts.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna bidhaa'**
  String get inventoryNoProducts;

  /// No description provided for @inventoryAddProduct.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Bidhaa'**
  String get inventoryAddProduct;

  /// No description provided for @inventoryProductName.
  ///
  /// In sw, this message translates to:
  /// **'Jina la Bidhaa'**
  String get inventoryProductName;

  /// No description provided for @inventorySku.
  ///
  /// In sw, this message translates to:
  /// **'SKU'**
  String get inventorySku;

  /// No description provided for @inventoryCostPrice.
  ///
  /// In sw, this message translates to:
  /// **'Bei ya Kununua'**
  String get inventoryCostPrice;

  /// No description provided for @inventorySellingPrice.
  ///
  /// In sw, this message translates to:
  /// **'Bei ya Kuuza'**
  String get inventorySellingPrice;

  /// No description provided for @inventoryStockQty.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi cha Stoo'**
  String get inventoryStockQty;

  /// No description provided for @inventoryReorderLevel.
  ///
  /// In sw, this message translates to:
  /// **'Kiwango cha Kuagiza Tena'**
  String get inventoryReorderLevel;

  /// No description provided for @inventorySaveProduct.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi Bidhaa'**
  String get inventorySaveProduct;

  /// No description provided for @inventoryProductAdded.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa imeongezwa'**
  String get inventoryProductAdded;

  /// No description provided for @inventoryProductUpdated.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa imesasishwa'**
  String get inventoryProductUpdated;

  /// No description provided for @inventoryLowStock.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa Chache'**
  String get inventoryLowStock;

  /// No description provided for @inventoryAdjustStock.
  ///
  /// In sw, this message translates to:
  /// **'Rekebisha Stoo'**
  String get inventoryAdjustStock;

  /// No description provided for @inventoryStockHistory.
  ///
  /// In sw, this message translates to:
  /// **'Historia ya Stoo'**
  String get inventoryStockHistory;

  /// No description provided for @inventoryCategories.
  ///
  /// In sw, this message translates to:
  /// **'Makundi'**
  String get inventoryCategories;

  /// No description provided for @inventoryCategory.
  ///
  /// In sw, this message translates to:
  /// **'Kundi'**
  String get inventoryCategory;

  /// No description provided for @inventoryUnit.
  ///
  /// In sw, this message translates to:
  /// **'Kipimo'**
  String get inventoryUnit;

  /// No description provided for @inventoryReceiveStock.
  ///
  /// In sw, this message translates to:
  /// **'Pokea Stoo'**
  String get inventoryReceiveStock;

  /// No description provided for @inventoryDamagedStock.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa Zilizoharibika'**
  String get inventoryDamagedStock;

  /// No description provided for @inventoryLostStock.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa Zilizopotea'**
  String get inventoryLostStock;

  /// No description provided for @inventoryStockValue.
  ///
  /// In sw, this message translates to:
  /// **'Thamani ya Stoo'**
  String get inventoryStockValue;

  /// No description provided for @inventoryEditProduct.
  ///
  /// In sw, this message translates to:
  /// **'Hariri Bidhaa'**
  String get inventoryEditProduct;

  /// No description provided for @inventoryArchive.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi kwa Kumbukumbu'**
  String get inventoryArchive;

  /// No description provided for @inventoryCurrentStock.
  ///
  /// In sw, this message translates to:
  /// **'Stoo ya Sasa'**
  String get inventoryCurrentStock;

  /// No description provided for @inventoryNewStock.
  ///
  /// In sw, this message translates to:
  /// **'Stoo Mpya'**
  String get inventoryNewStock;

  /// No description provided for @inventoryReason.
  ///
  /// In sw, this message translates to:
  /// **'Sababu'**
  String get inventoryReason;

  /// No description provided for @inventoryStockAdjusted.
  ///
  /// In sw, this message translates to:
  /// **'Stoo imerekebishwa'**
  String get inventoryStockAdjusted;

  /// No description provided for @inventoryInStock.
  ///
  /// In sw, this message translates to:
  /// **'Stoo'**
  String get inventoryInStock;

  /// No description provided for @inventoryTotalValue.
  ///
  /// In sw, this message translates to:
  /// **'Thamani Jumla'**
  String get inventoryTotalValue;

  /// No description provided for @inventoryTotalRetailValue.
  ///
  /// In sw, this message translates to:
  /// **'Thamani ya Kuuza'**
  String get inventoryTotalRetailValue;

  /// No description provided for @inventoryTotalProducts.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa zote'**
  String get inventoryTotalProducts;

  /// No description provided for @inventoryFastMoving.
  ///
  /// In sw, this message translates to:
  /// **'Zinazokwenda Haraka'**
  String get inventoryFastMoving;

  /// No description provided for @inventorySlowMoving.
  ///
  /// In sw, this message translates to:
  /// **'Zinazokwenda Polepole'**
  String get inventorySlowMoving;

  /// No description provided for @customersTitle.
  ///
  /// In sw, this message translates to:
  /// **'Wateja na Deni'**
  String get customersTitle;

  /// No description provided for @customersAddCustomer.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Mteja'**
  String get customersAddCustomer;

  /// No description provided for @customersFullName.
  ///
  /// In sw, this message translates to:
  /// **'Jina Kamili'**
  String get customersFullName;

  /// No description provided for @customersPhone.
  ///
  /// In sw, this message translates to:
  /// **'Simu'**
  String get customersPhone;

  /// No description provided for @customersAddress.
  ///
  /// In sw, this message translates to:
  /// **'Anwani'**
  String get customersAddress;

  /// No description provided for @customersSaveCustomer.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi Mteja'**
  String get customersSaveCustomer;

  /// No description provided for @customersCustomerAdded.
  ///
  /// In sw, this message translates to:
  /// **'Mteja ameongezwa'**
  String get customersCustomerAdded;

  /// No description provided for @customersCustomerUpdated.
  ///
  /// In sw, this message translates to:
  /// **'Mteja amesasishwa'**
  String get customersCustomerUpdated;

  /// No description provided for @customersNoCustomers.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna wateja bado'**
  String get customersNoCustomers;

  /// No description provided for @customersOutstanding.
  ///
  /// In sw, this message translates to:
  /// **'Deni: {amount}'**
  String customersOutstanding(String amount);

  /// No description provided for @customersOutstandingBalance.
  ///
  /// In sw, this message translates to:
  /// **'Deni Iliyobaki'**
  String get customersOutstandingBalance;

  /// No description provided for @customersRecordPayment.
  ///
  /// In sw, this message translates to:
  /// **'Rekodi Malipo ya Deni'**
  String get customersRecordPayment;

  /// No description provided for @customersPurchaseHistory.
  ///
  /// In sw, this message translates to:
  /// **'Historia ya Manunuzi'**
  String get customersPurchaseHistory;

  /// No description provided for @customersNoPurchases.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna manunuzi bado'**
  String get customersNoPurchases;

  /// No description provided for @customersPayment.
  ///
  /// In sw, this message translates to:
  /// **'Malipo'**
  String get customersPayment;

  /// No description provided for @customersPaymentRecorded.
  ///
  /// In sw, this message translates to:
  /// **'Malipo yamerekodiwa'**
  String get customersPaymentRecorded;

  /// No description provided for @customersAmount.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi'**
  String get customersAmount;

  /// No description provided for @customersEditCustomer.
  ///
  /// In sw, this message translates to:
  /// **'Hariri Mteja'**
  String get customersEditCustomer;

  /// No description provided for @customersCreditHistory.
  ///
  /// In sw, this message translates to:
  /// **'Historia ya Deni'**
  String get customersCreditHistory;

  /// No description provided for @customersOverdue.
  ///
  /// In sw, this message translates to:
  /// **'Deni zilizochelewa'**
  String get customersOverdue;

  /// No description provided for @customersOwes.
  ///
  /// In sw, this message translates to:
  /// **'{name} anadaiwa {amount}'**
  String customersOwes(String name, String amount);

  /// No description provided for @customersSearch.
  ///
  /// In sw, this message translates to:
  /// **'Tafuta mteja'**
  String get customersSearch;

  /// No description provided for @expensesTitle.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi'**
  String get expensesTitle;

  /// No description provided for @expensesAddExpense.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Matumizi'**
  String get expensesAddExpense;

  /// No description provided for @expensesCategory.
  ///
  /// In sw, this message translates to:
  /// **'Kundi'**
  String get expensesCategory;

  /// No description provided for @expensesAmount.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi'**
  String get expensesAmount;

  /// No description provided for @expensesDescription.
  ///
  /// In sw, this message translates to:
  /// **'Maelezo'**
  String get expensesDescription;

  /// No description provided for @expensesSaveExpense.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi Matumizi'**
  String get expensesSaveExpense;

  /// No description provided for @expensesExpenseRecorded.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi yamerekodiwa'**
  String get expensesExpenseRecorded;

  /// No description provided for @expensesExpenseUpdated.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi yamesasishwa'**
  String get expensesExpenseUpdated;

  /// No description provided for @expensesNoExpenses.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna matumizi bado'**
  String get expensesNoExpenses;

  /// No description provided for @expensesEditExpense.
  ///
  /// In sw, this message translates to:
  /// **'Hariri Matumizi'**
  String get expensesEditExpense;

  /// No description provided for @expensesFilter.
  ///
  /// In sw, this message translates to:
  /// **'Chuja'**
  String get expensesFilter;

  /// No description provided for @expensesTotal.
  ///
  /// In sw, this message translates to:
  /// **'Jumla ya Matumizi'**
  String get expensesTotal;

  /// No description provided for @loansTitle.
  ///
  /// In sw, this message translates to:
  /// **'Mikopo'**
  String get loansTitle;

  /// No description provided for @loansAddLoan.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Mkopo'**
  String get loansAddLoan;

  /// No description provided for @loansLender.
  ///
  /// In sw, this message translates to:
  /// **'Mkopaji/Mwenye Kukopesha'**
  String get loansLender;

  /// No description provided for @loansAmount.
  ///
  /// In sw, this message translates to:
  /// **'Kiasi'**
  String get loansAmount;

  /// No description provided for @loansInterest.
  ///
  /// In sw, this message translates to:
  /// **'Riba %'**
  String get loansInterest;

  /// No description provided for @loansDueDate.
  ///
  /// In sw, this message translates to:
  /// **'Tarehe ya Mwisho'**
  String get loansDueDate;

  /// No description provided for @loansSaveLoan.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi Mkopo'**
  String get loansSaveLoan;

  /// No description provided for @loansLoanCreated.
  ///
  /// In sw, this message translates to:
  /// **'Mkopo umeundwa'**
  String get loansLoanCreated;

  /// No description provided for @loansNoLoans.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna mikopo bado'**
  String get loansNoLoans;

  /// No description provided for @loansBalance.
  ///
  /// In sw, this message translates to:
  /// **'Salio'**
  String get loansBalance;

  /// No description provided for @loansPaid.
  ///
  /// In sw, this message translates to:
  /// **'Imelipwa'**
  String get loansPaid;

  /// No description provided for @loansActive.
  ///
  /// In sw, this message translates to:
  /// **'Hai'**
  String get loansActive;

  /// No description provided for @loansRecordRepayment.
  ///
  /// In sw, this message translates to:
  /// **'Rekodi Marejesho'**
  String get loansRecordRepayment;

  /// No description provided for @loansRepaymentRecorded.
  ///
  /// In sw, this message translates to:
  /// **'Marejesho yamerekodiwa'**
  String get loansRepaymentRecorded;

  /// No description provided for @loansRemaining.
  ///
  /// In sw, this message translates to:
  /// **'Iliyobaki'**
  String get loansRemaining;

  /// No description provided for @loansTotalBorrowed.
  ///
  /// In sw, this message translates to:
  /// **'Jumla Iliyokopwa'**
  String get loansTotalBorrowed;

  /// No description provided for @loansTotalOutstanding.
  ///
  /// In sw, this message translates to:
  /// **'Salio Zote'**
  String get loansTotalOutstanding;

  /// No description provided for @loansTotalRepaid.
  ///
  /// In sw, this message translates to:
  /// **'Jumla Iliyolipwa'**
  String get loansTotalRepaid;

  /// No description provided for @employeesTitle.
  ///
  /// In sw, this message translates to:
  /// **'Wafanyakazi'**
  String get employeesTitle;

  /// No description provided for @employeesAddEmployee.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Mfanyakazi'**
  String get employeesAddEmployee;

  /// No description provided for @employeesFullName.
  ///
  /// In sw, this message translates to:
  /// **'Jina Kamili'**
  String get employeesFullName;

  /// No description provided for @employeesPhone.
  ///
  /// In sw, this message translates to:
  /// **'Simu'**
  String get employeesPhone;

  /// No description provided for @employeesRole.
  ///
  /// In sw, this message translates to:
  /// **'Jukumu'**
  String get employeesRole;

  /// No description provided for @employeesAdd.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Mfanyakazi'**
  String get employeesAdd;

  /// No description provided for @employeesEmployeeAdded.
  ///
  /// In sw, this message translates to:
  /// **'Mfanyakazi ameongezwa. SMS imetumwa.'**
  String get employeesEmployeeAdded;

  /// No description provided for @employeesNoEmployees.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna wafanyakazi bado'**
  String get employeesNoEmployees;

  /// No description provided for @employeesOnlyOwners.
  ///
  /// In sw, this message translates to:
  /// **'Ni wamiliki wa biashara pekee wanaoweza kusimamia wafanyakazi'**
  String get employeesOnlyOwners;

  /// No description provided for @employeesCashier.
  ///
  /// In sw, this message translates to:
  /// **'Keshia'**
  String get employeesCashier;

  /// No description provided for @employeesShopEmployee.
  ///
  /// In sw, this message translates to:
  /// **'Mfanyakazi wa Duka'**
  String get employeesShopEmployee;

  /// No description provided for @employeesStockClerk.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi ya Stoo'**
  String get employeesStockClerk;

  /// No description provided for @employeesManager.
  ///
  /// In sw, this message translates to:
  /// **'Meneja'**
  String get employeesManager;

  /// No description provided for @employeesActive.
  ///
  /// In sw, this message translates to:
  /// **'Hai'**
  String get employeesActive;

  /// No description provided for @employeesInactive.
  ///
  /// In sw, this message translates to:
  /// **'Si hai'**
  String get employeesInactive;

  /// No description provided for @employeesResetPin.
  ///
  /// In sw, this message translates to:
  /// **'Rekebisha PIN'**
  String get employeesResetPin;

  /// No description provided for @employeesRemove.
  ///
  /// In sw, this message translates to:
  /// **'Ondoa'**
  String get employeesRemove;

  /// No description provided for @employeesActivity.
  ///
  /// In sw, this message translates to:
  /// **'Shughuli za Mfanyakazi'**
  String get employeesActivity;

  /// No description provided for @reportsTitle.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti'**
  String get reportsTitle;

  /// No description provided for @reportsSalesReport.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti ya Mauzo'**
  String get reportsSalesReport;

  /// No description provided for @reportsInventoryValuation.
  ///
  /// In sw, this message translates to:
  /// **'Thamani ya Stoo'**
  String get reportsInventoryValuation;

  /// No description provided for @reportsProfitReport.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti ya Faida'**
  String get reportsProfitReport;

  /// No description provided for @reportsExpenseReport.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti ya Matumizi'**
  String get reportsExpenseReport;

  /// No description provided for @reportsCreditReport.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti ya Deni'**
  String get reportsCreditReport;

  /// No description provided for @reportsLoanReport.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti ya Mikopo'**
  String get reportsLoanReport;

  /// No description provided for @reportsCashflowReport.
  ///
  /// In sw, this message translates to:
  /// **'Mtiririko wa Fedha'**
  String get reportsCashflowReport;

  /// No description provided for @reportsEmployeeReport.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti ya Wafanyakazi'**
  String get reportsEmployeeReport;

  /// No description provided for @reportsPaymentMethodsReport.
  ///
  /// In sw, this message translates to:
  /// **'Njia za Malipo'**
  String get reportsPaymentMethodsReport;

  /// No description provided for @reportsTotalSales.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo Jumla'**
  String get reportsTotalSales;

  /// No description provided for @reportsTransactions.
  ///
  /// In sw, this message translates to:
  /// **'Miamala'**
  String get reportsTransactions;

  /// No description provided for @reportsTotalItems.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa Jumla'**
  String get reportsTotalItems;

  /// No description provided for @reportsAvgTicket.
  ///
  /// In sw, this message translates to:
  /// **'Wastani wa Tiketi'**
  String get reportsAvgTicket;

  /// No description provided for @reportsRecentSales.
  ///
  /// In sw, this message translates to:
  /// **'Mauzo ya Hivi Karibuni'**
  String get reportsRecentSales;

  /// No description provided for @reportsAvailableReports.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti Zinazopatikana'**
  String get reportsAvailableReports;

  /// No description provided for @reportsThisMonth.
  ///
  /// In sw, this message translates to:
  /// **'Mwezi Huu'**
  String get reportsThisMonth;

  /// No description provided for @reportsDaily.
  ///
  /// In sw, this message translates to:
  /// **'Kila Siku'**
  String get reportsDaily;

  /// No description provided for @reportsWeekly.
  ///
  /// In sw, this message translates to:
  /// **'Kila Wiki'**
  String get reportsWeekly;

  /// No description provided for @reportsMonthly.
  ///
  /// In sw, this message translates to:
  /// **'Kila Mwezi'**
  String get reportsMonthly;

  /// No description provided for @reportsYearly.
  ///
  /// In sw, this message translates to:
  /// **'Kila Mwaka'**
  String get reportsYearly;

  /// No description provided for @reportsCustom.
  ///
  /// In sw, this message translates to:
  /// **'Muda Maalum'**
  String get reportsCustom;

  /// No description provided for @reportsToday.
  ///
  /// In sw, this message translates to:
  /// **'Leo'**
  String get reportsToday;

  /// No description provided for @reportsYesterday.
  ///
  /// In sw, this message translates to:
  /// **'Jana'**
  String get reportsYesterday;

  /// No description provided for @reportsThisWeek.
  ///
  /// In sw, this message translates to:
  /// **'Wiki Hii'**
  String get reportsThisWeek;

  /// No description provided for @reportsPreviousWeek.
  ///
  /// In sw, this message translates to:
  /// **'Wiki Iliyopita'**
  String get reportsPreviousWeek;

  /// No description provided for @reportsFrom.
  ///
  /// In sw, this message translates to:
  /// **'Kutoka'**
  String get reportsFrom;

  /// No description provided for @reportsTo.
  ///
  /// In sw, this message translates to:
  /// **'Mpaka'**
  String get reportsTo;

  /// No description provided for @reportsSelectPeriod.
  ///
  /// In sw, this message translates to:
  /// **'Chagua Muda'**
  String get reportsSelectPeriod;

  /// No description provided for @reportsTotalRevenue.
  ///
  /// In sw, this message translates to:
  /// **'Mapato Jumla'**
  String get reportsTotalRevenue;

  /// No description provided for @reportsTotalDiscounts.
  ///
  /// In sw, this message translates to:
  /// **'Punguzo Jumla'**
  String get reportsTotalDiscounts;

  /// No description provided for @reportsTotalExpenses.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi Jumla'**
  String get reportsTotalExpenses;

  /// No description provided for @reportsEstimatedProfit.
  ///
  /// In sw, this message translates to:
  /// **'Faida Kadiriwa'**
  String get reportsEstimatedProfit;

  /// No description provided for @reportsByCategory.
  ///
  /// In sw, this message translates to:
  /// **'Kwa Kundi'**
  String get reportsByCategory;

  /// No description provided for @reportsTotalValue.
  ///
  /// In sw, this message translates to:
  /// **'Thamani Jumla'**
  String get reportsTotalValue;

  /// No description provided for @reportsTotalRetailValue.
  ///
  /// In sw, this message translates to:
  /// **'Thamani ya Kuuza'**
  String get reportsTotalRetailValue;

  /// No description provided for @reportsTotalProducts.
  ///
  /// In sw, this message translates to:
  /// **'Bidhaa Jumla'**
  String get reportsTotalProducts;

  /// No description provided for @reportsTotalOutstanding.
  ///
  /// In sw, this message translates to:
  /// **'Deni Jumla'**
  String get reportsTotalOutstanding;

  /// No description provided for @reportsCustomersWithDebt.
  ///
  /// In sw, this message translates to:
  /// **'Wateja wenye Deni'**
  String get reportsCustomersWithDebt;

  /// No description provided for @reportsTotalBorrowed.
  ///
  /// In sw, this message translates to:
  /// **'Jumla Iliyokopwa'**
  String get reportsTotalBorrowed;

  /// No description provided for @reportsTotalRepaid.
  ///
  /// In sw, this message translates to:
  /// **'Jumla Iliyolipwa'**
  String get reportsTotalRepaid;

  /// No description provided for @reportsNetCashFlow.
  ///
  /// In sw, this message translates to:
  /// **'Mtiririko Halisi wa Fedha'**
  String get reportsNetCashFlow;

  /// No description provided for @reportsTotalInflow.
  ///
  /// In sw, this message translates to:
  /// **'Mapato Jumla'**
  String get reportsTotalInflow;

  /// No description provided for @reportsTotalOutflow.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi Jumla'**
  String get reportsTotalOutflow;

  /// No description provided for @reportsCreditCollections.
  ///
  /// In sw, this message translates to:
  /// **'Malipo ya Deni'**
  String get reportsCreditCollections;

  /// No description provided for @reportsNoData.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna data kwa muda uliochaguliwa'**
  String get reportsNoData;

  /// No description provided for @reportsLoadError.
  ///
  /// In sw, this message translates to:
  /// **'Imeshindwa kupakia ripoti'**
  String get reportsLoadError;

  /// No description provided for @moreTitle.
  ///
  /// In sw, this message translates to:
  /// **'Zaidi'**
  String get moreTitle;

  /// No description provided for @moreBusiness.
  ///
  /// In sw, this message translates to:
  /// **'Biashara'**
  String get moreBusiness;

  /// No description provided for @moreFinancial.
  ///
  /// In sw, this message translates to:
  /// **'Fedha'**
  String get moreFinancial;

  /// No description provided for @moreSystem.
  ///
  /// In sw, this message translates to:
  /// **'Mfumo'**
  String get moreSystem;

  /// No description provided for @moreAccount.
  ///
  /// In sw, this message translates to:
  /// **'Akaunti'**
  String get moreAccount;

  /// No description provided for @moreEmployees.
  ///
  /// In sw, this message translates to:
  /// **'Wafanyakazi'**
  String get moreEmployees;

  /// No description provided for @moreReceiptSettings.
  ///
  /// In sw, this message translates to:
  /// **'Mipangilio ya Risiti'**
  String get moreReceiptSettings;

  /// No description provided for @moreExpenses.
  ///
  /// In sw, this message translates to:
  /// **'Matumizi'**
  String get moreExpenses;

  /// No description provided for @moreCustomersCredit.
  ///
  /// In sw, this message translates to:
  /// **'Wateja na Deni'**
  String get moreCustomersCredit;

  /// No description provided for @moreLoans.
  ///
  /// In sw, this message translates to:
  /// **'Mikopo'**
  String get moreLoans;

  /// No description provided for @moreSyncStatus.
  ///
  /// In sw, this message translates to:
  /// **'Hali ya Usawazishaji'**
  String get moreSyncStatus;

  /// No description provided for @moreBackup.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi Nakala'**
  String get moreBackup;

  /// No description provided for @moreChangePin.
  ///
  /// In sw, this message translates to:
  /// **'Badilisha PIN'**
  String get moreChangePin;

  /// No description provided for @moreAbout.
  ///
  /// In sw, this message translates to:
  /// **'Kuhusu'**
  String get moreAbout;

  /// No description provided for @moreLogout.
  ///
  /// In sw, this message translates to:
  /// **'Toka'**
  String get moreLogout;

  /// No description provided for @moreLoggedInAs.
  ///
  /// In sw, this message translates to:
  /// **'Umeingia kama {name}'**
  String moreLoggedInAs(String name);

  /// No description provided for @moreShops.
  ///
  /// In sw, this message translates to:
  /// **'Maduka'**
  String get moreShops;

  /// No description provided for @moreManageShops.
  ///
  /// In sw, this message translates to:
  /// **'Simamia Maduka'**
  String get moreManageShops;

  /// No description provided for @moreBusinessSettings.
  ///
  /// In sw, this message translates to:
  /// **'Mipangilio ya Biashara'**
  String get moreBusinessSettings;

  /// No description provided for @moreNotifications.
  ///
  /// In sw, this message translates to:
  /// **'Arifa'**
  String get moreNotifications;

  /// No description provided for @moreSupport.
  ///
  /// In sw, this message translates to:
  /// **'Msaada'**
  String get moreSupport;

  /// No description provided for @moreLanguage.
  ///
  /// In sw, this message translates to:
  /// **'Lugha'**
  String get moreLanguage;

  /// No description provided for @moreSyncNow.
  ///
  /// In sw, this message translates to:
  /// **'Sasisha Sasa'**
  String get moreSyncNow;

  /// No description provided for @morePendingOffline.
  ///
  /// In sw, this message translates to:
  /// **'Zinangojea nje ya mtandao'**
  String get morePendingOffline;

  /// No description provided for @moreLastPull.
  ///
  /// In sw, this message translates to:
  /// **'Usawazishaji wa mwisho'**
  String get moreLastPull;

  /// No description provided for @moreLastPush.
  ///
  /// In sw, this message translates to:
  /// **'Usafirishaji wa mwisho'**
  String get moreLastPush;

  /// No description provided for @moreComingSoon.
  ///
  /// In sw, this message translates to:
  /// **'Inakuja hivi karibuni'**
  String get moreComingSoon;

  /// No description provided for @moreSyncedCount.
  ///
  /// In sw, this message translates to:
  /// **'{pushed} bidhaa zimesawazishwa. {failed} hazikufanikiwa.'**
  String moreSyncedCount(int pushed, int failed);

  /// No description provided for @moreSyncFailed.
  ///
  /// In sw, this message translates to:
  /// **'Usawazishaji umeshindikana: {pending} zinangojea'**
  String moreSyncFailed(int pending);

  /// No description provided for @moreNoShop.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna duka linalopatikana'**
  String get moreNoShop;

  /// No description provided for @moreCouldNotReachSync.
  ///
  /// In sw, this message translates to:
  /// **'Imeshindwa kufikia huduma ya usawazishaji'**
  String get moreCouldNotReachSync;

  /// No description provided for @shopTitle.
  ///
  /// In sw, this message translates to:
  /// **'Maduka'**
  String get shopTitle;

  /// No description provided for @shopAddShop.
  ///
  /// In sw, this message translates to:
  /// **'Ongeza Duka'**
  String get shopAddShop;

  /// No description provided for @shopName.
  ///
  /// In sw, this message translates to:
  /// **'Jina la Duka'**
  String get shopName;

  /// No description provided for @shopAddress.
  ///
  /// In sw, this message translates to:
  /// **'Anwani'**
  String get shopAddress;

  /// No description provided for @shopCurrency.
  ///
  /// In sw, this message translates to:
  /// **'Sarafu'**
  String get shopCurrency;

  /// No description provided for @shopSaveShop.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi Duka'**
  String get shopSaveShop;

  /// No description provided for @shopShopCreated.
  ///
  /// In sw, this message translates to:
  /// **'Duka limeundwa'**
  String get shopShopCreated;

  /// No description provided for @shopShopUpdated.
  ///
  /// In sw, this message translates to:
  /// **'Duka limesasishwa'**
  String get shopShopUpdated;

  /// No description provided for @shopArchive.
  ///
  /// In sw, this message translates to:
  /// **'Hifadhi kwa Kumbukumbu'**
  String get shopArchive;

  /// No description provided for @shopNoShops.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna maduka'**
  String get shopNoShops;

  /// No description provided for @shopSwitchShop.
  ///
  /// In sw, this message translates to:
  /// **'Badilisha Duka'**
  String get shopSwitchShop;

  /// No description provided for @shopAllShops.
  ///
  /// In sw, this message translates to:
  /// **'Maduka Yote'**
  String get shopAllShops;

  /// No description provided for @shopActive.
  ///
  /// In sw, this message translates to:
  /// **'Hai'**
  String get shopActive;

  /// No description provided for @shopArchived.
  ///
  /// In sw, this message translates to:
  /// **'Imehifadhiwa'**
  String get shopArchived;

  /// No description provided for @shopSelectShop.
  ///
  /// In sw, this message translates to:
  /// **'Chagua Duka'**
  String get shopSelectShop;

  /// No description provided for @shopCurrent.
  ///
  /// In sw, this message translates to:
  /// **'Duka la Sasa'**
  String get shopCurrent;

  /// No description provided for @notificationsTitle.
  ///
  /// In sw, this message translates to:
  /// **'Arifa'**
  String get notificationsTitle;

  /// No description provided for @notificationsNoNotifications.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna arifa'**
  String get notificationsNoNotifications;

  /// No description provided for @notificationsMarkAllRead.
  ///
  /// In sw, this message translates to:
  /// **'Weka zote kama zimesomwa'**
  String get notificationsMarkAllRead;

  /// No description provided for @notificationsMarkRead.
  ///
  /// In sw, this message translates to:
  /// **'Weka kama imesomwa'**
  String get notificationsMarkRead;

  /// No description provided for @supportTitle.
  ///
  /// In sw, this message translates to:
  /// **'Msaada'**
  String get supportTitle;

  /// No description provided for @supportContact.
  ///
  /// In sw, this message translates to:
  /// **'Mawasiliano ya Msaada'**
  String get supportContact;

  /// No description provided for @supportDescription.
  ///
  /// In sw, this message translates to:
  /// **'Kwa usaidizi, tafadhali wasiliana nasi kupitia:'**
  String get supportDescription;

  /// No description provided for @supportEmail.
  ///
  /// In sw, this message translates to:
  /// **'Barua pepe'**
  String get supportEmail;

  /// No description provided for @supportPhone.
  ///
  /// In sw, this message translates to:
  /// **'Simu'**
  String get supportPhone;

  /// No description provided for @supportNoContact.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna mawasiliano ya msaada yaliyopangwa'**
  String get supportNoContact;

  /// No description provided for @profileTitle.
  ///
  /// In sw, this message translates to:
  /// **'Wasifu'**
  String get profileTitle;

  /// No description provided for @profileEdit.
  ///
  /// In sw, this message translates to:
  /// **'Hariri Wasifu'**
  String get profileEdit;

  /// No description provided for @profileName.
  ///
  /// In sw, this message translates to:
  /// **'Jina'**
  String get profileName;

  /// No description provided for @profileRole.
  ///
  /// In sw, this message translates to:
  /// **'Jukumu'**
  String get profileRole;

  /// No description provided for @profileUpdated.
  ///
  /// In sw, this message translates to:
  /// **'Wasifu umesasishwa'**
  String get profileUpdated;

  /// No description provided for @errorGeneric.
  ///
  /// In sw, this message translates to:
  /// **'Hitilafu imetokea. Tafadhali jaribu tena.'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna muunganisho wa mtandao.'**
  String get errorNetwork;

  /// No description provided for @errorUnauthorized.
  ///
  /// In sw, this message translates to:
  /// **'Hujaruhusiwa kufanya kitendo hiki.'**
  String get errorUnauthorized;

  /// No description provided for @errorForbidden.
  ///
  /// In sw, this message translates to:
  /// **'Huna ruhusa ya kufanya kitendo hiki.'**
  String get errorForbidden;

  /// No description provided for @errorNotFound.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna kilichopatikana.'**
  String get errorNotFound;

  /// No description provided for @errorValidation.
  ///
  /// In sw, this message translates to:
  /// **'Tafadhali angalia taarifa ulizoingiza.'**
  String get errorValidation;

  /// No description provided for @errorStockNegative.
  ///
  /// In sw, this message translates to:
  /// **'Stoo haiwezi kuwa chini ya sifuri'**
  String get errorStockNegative;

  /// No description provided for @errorInsufficientStock.
  ///
  /// In sw, this message translates to:
  /// **'Stoo haitoshi'**
  String get errorInsufficientStock;

  /// No description provided for @supportMyTickets.
  ///
  /// In sw, this message translates to:
  /// **'Tiketi Zangu za Msaada'**
  String get supportMyTickets;

  /// No description provided for @supportNoTickets.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna tiketi bado'**
  String get supportNoTickets;

  /// No description provided for @supportNewTicket.
  ///
  /// In sw, this message translates to:
  /// **'Tiketi Mpya'**
  String get supportNewTicket;

  /// No description provided for @supportSubject.
  ///
  /// In sw, this message translates to:
  /// **'Mada'**
  String get supportSubject;

  /// No description provided for @supportMessage.
  ///
  /// In sw, this message translates to:
  /// **'Ujumbe'**
  String get supportMessage;

  /// No description provided for @supportPriority.
  ///
  /// In sw, this message translates to:
  /// **'Kipaumbele'**
  String get supportPriority;

  /// No description provided for @supportSubmit.
  ///
  /// In sw, this message translates to:
  /// **'Tuma'**
  String get supportSubmit;

  /// No description provided for @supportTicketCreated.
  ///
  /// In sw, this message translates to:
  /// **'Tiketi imetumwa'**
  String get supportTicketCreated;

  /// No description provided for @supportReply.
  ///
  /// In sw, this message translates to:
  /// **'Jibu'**
  String get supportReply;

  /// No description provided for @supportReplies.
  ///
  /// In sw, this message translates to:
  /// **'Majibu'**
  String get supportReplies;

  /// No description provided for @supportStatus.
  ///
  /// In sw, this message translates to:
  /// **'Hali'**
  String get supportStatus;

  /// No description provided for @supportStatusOpen.
  ///
  /// In sw, this message translates to:
  /// **'Wazi'**
  String get supportStatusOpen;

  /// No description provided for @supportStatusResolved.
  ///
  /// In sw, this message translates to:
  /// **'Tatuliwa'**
  String get supportStatusResolved;

  /// No description provided for @supportStatusClosed.
  ///
  /// In sw, this message translates to:
  /// **'Imefungwa'**
  String get supportStatusClosed;

  /// No description provided for @supportSendReply.
  ///
  /// In sw, this message translates to:
  /// **'Tuma jibu'**
  String get supportSendReply;

  /// No description provided for @supportTypeReply.
  ///
  /// In sw, this message translates to:
  /// **'Andika jibu...'**
  String get supportTypeReply;

  /// No description provided for @receiptTitle.
  ///
  /// In sw, this message translates to:
  /// **'Mipangilio ya Stakabadhi'**
  String get receiptTitle;

  /// No description provided for @receiptHeader.
  ///
  /// In sw, this message translates to:
  /// **'Kichwa cha stakabadhi'**
  String get receiptHeader;

  /// No description provided for @receiptFooter.
  ///
  /// In sw, this message translates to:
  /// **'Mwisho wa stakabadhi'**
  String get receiptFooter;

  /// No description provided for @receiptTaxNumber.
  ///
  /// In sw, this message translates to:
  /// **'Namba ya kodi (TIN)'**
  String get receiptTaxNumber;

  /// No description provided for @receiptCurrency.
  ///
  /// In sw, this message translates to:
  /// **'Sarafu'**
  String get receiptCurrency;

  /// No description provided for @receiptLanguage.
  ///
  /// In sw, this message translates to:
  /// **'Lugha'**
  String get receiptLanguage;

  /// No description provided for @receiptPrinter.
  ///
  /// In sw, this message translates to:
  /// **'Kichapishaji'**
  String get receiptPrinter;

  /// No description provided for @receiptPrinterType.
  ///
  /// In sw, this message translates to:
  /// **'Aina ya kichapishaji'**
  String get receiptPrinterType;

  /// No description provided for @receiptPrinterBluetooth.
  ///
  /// In sw, this message translates to:
  /// **'Bluetooth'**
  String get receiptPrinterBluetooth;

  /// No description provided for @receiptPrinterNone.
  ///
  /// In sw, this message translates to:
  /// **'Hakuna'**
  String get receiptPrinterNone;

  /// No description provided for @receiptUpdated.
  ///
  /// In sw, this message translates to:
  /// **'Mipangilio imehifadhiwa'**
  String get receiptUpdated;

  /// No description provided for @receiptLoadError.
  ///
  /// In sw, this message translates to:
  /// **'Imeshindikana kupakia mipangilio'**
  String get receiptLoadError;

  /// No description provided for @reportsExport.
  ///
  /// In sw, this message translates to:
  /// **'Hamisha'**
  String get reportsExport;

  /// No description provided for @reportsExportPdf.
  ///
  /// In sw, this message translates to:
  /// **'PDF'**
  String get reportsExportPdf;

  /// No description provided for @reportsExportExcel.
  ///
  /// In sw, this message translates to:
  /// **'Excel'**
  String get reportsExportExcel;

  /// No description provided for @reportsExportCsv.
  ///
  /// In sw, this message translates to:
  /// **'CSV'**
  String get reportsExportCsv;

  /// No description provided for @reportsExporting.
  ///
  /// In sw, this message translates to:
  /// **'Inatayarisha faili...'**
  String get reportsExporting;

  /// No description provided for @reportsExportSuccess.
  ///
  /// In sw, this message translates to:
  /// **'Ripoti imepakuliwa'**
  String get reportsExportSuccess;

  /// No description provided for @reportsExportError.
  ///
  /// In sw, this message translates to:
  /// **'Imeshindikana kuhamisha ripoti'**
  String get reportsExportError;

  /// No description provided for @reportsChooseFormat.
  ///
  /// In sw, this message translates to:
  /// **'Chagua muundo wa faili'**
  String get reportsChooseFormat;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'sw'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'sw':
      return AppLocalizationsSw();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
