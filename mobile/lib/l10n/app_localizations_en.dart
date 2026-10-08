// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Mwaminifu';

  @override
  String get businessManagement => 'Business Management';

  @override
  String get languageLabel => 'Language';

  @override
  String get languageKiswahili => 'Kiswahili';

  @override
  String get languageEnglish => 'English';

  @override
  String get commonSave => 'Save';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonDelete => 'Delete';

  @override
  String get commonConfirm => 'Confirm';

  @override
  String get commonEdit => 'Edit';

  @override
  String get commonAdd => 'Add';

  @override
  String get commonSearch => 'Search';

  @override
  String get commonLogout => 'Logout';

  @override
  String get commonRetry => 'Try again';

  @override
  String get commonClose => 'Close';

  @override
  String get commonBack => 'Back';

  @override
  String get commonDone => 'Done';

  @override
  String get commonRefresh => 'Refresh';

  @override
  String get commonOptional => 'optional';

  @override
  String get commonAll => 'All';

  @override
  String get commonToday => 'Today';

  @override
  String get commonName => 'Name';

  @override
  String get commonPhone => 'Phone number';

  @override
  String get commonAmount => 'Amount';

  @override
  String get commonDate => 'Date';

  @override
  String get commonLoading => 'Loading...';

  @override
  String get commonYes => 'Yes';

  @override
  String get commonNo => 'No';

  @override
  String get authLogin => 'Login';

  @override
  String get authBusinessOwner => 'Business Owner';

  @override
  String get authEmployee => 'Employee';

  @override
  String get authPhoneNumber => 'Phone Number';

  @override
  String get authPhoneHint => '255XXXXXXXXX';

  @override
  String get authPin => 'PIN';

  @override
  String get authPinHint => '6-digit PIN';

  @override
  String get authForgotPin => 'Forgot PIN? Get OTP';

  @override
  String get authEnterValidPhone => 'Enter a valid phone number';

  @override
  String get authEnterValidPin => 'Enter 6-digit PIN';

  @override
  String get authVerifyOtpTitle => 'Verify OTP';

  @override
  String get authEnterOtp => 'Enter OTP';

  @override
  String authOtpSentTo(int minutes) {
    return 'Enter the 6-digit code sent to your phone. Valid for $minutes minutes.';
  }

  @override
  String get authResendOtp => 'Resend OTP';

  @override
  String get authVerify => 'Verify';

  @override
  String get authCreatePin => 'Create PIN';

  @override
  String get authCreatePinDesc => 'Create a 6-digit PIN for daily login';

  @override
  String get authNewPin => 'New PIN';

  @override
  String get authConfirmPin => 'Confirm PIN';

  @override
  String get authSavePin => 'Save PIN';

  @override
  String get authPinsDoNotMatch => 'PINs do not match';

  @override
  String authMaintenanceTitle(String appName) {
    return '$appName is under maintenance';
  }

  @override
  String get authMaintenanceDesc =>
      'We are performing scheduled maintenance. Please check back shortly.';

  @override
  String get authTryAgain => 'Try Again';

  @override
  String get authOtpCode => 'OTP Code';

  @override
  String get authChangePin => 'Change PIN';

  @override
  String get authChangePinDesc => 'Change your 6-digit login PIN.';

  @override
  String get authCurrentPin => 'Current PIN';

  @override
  String get authEnterCurrentPin => 'Enter current 6-digit PIN';

  @override
  String get authNewPinMustDiffer => 'New PIN must differ from current';

  @override
  String get authUpdatePin => 'Update PIN';

  @override
  String get authPinChanged => 'PIN changed successfully';

  @override
  String get dashboardTitle => 'Dashboard';

  @override
  String get dashboardWelcomeBack => 'Welcome back,';

  @override
  String get dashboardTodaySales => 'Today Sales';

  @override
  String get dashboardProfit => 'Profit';

  @override
  String get dashboardCredit => 'Credit';

  @override
  String get dashboardLowStock => 'Low Stock';

  @override
  String get dashboardItems => 'items';

  @override
  String get dashboardQuickActions => 'Quick Actions';

  @override
  String get dashboardNewSale => 'New Sale';

  @override
  String get dashboardAddProduct => 'Add Product';

  @override
  String get dashboardAddExpense => 'Add Expense';

  @override
  String get dashboardReports => 'Reports';

  @override
  String get dashboardRecentActivity => 'Recent Activity';

  @override
  String get dashboardSalesToday => 'Sales today';

  @override
  String get dashboardViewReports => 'View reports';

  @override
  String get dashboardInventoryStatus => 'Inventory status';

  @override
  String get dashboardCheckStockLevels => 'Check stock levels';

  @override
  String get dashboardSyncStatus => 'Sync status';

  @override
  String get dashboardAllDataSynced => 'All data synced';

  @override
  String get dashboardExpensesToday => 'Today\'s expenses';

  @override
  String get dashboardTotalCustomers => 'Total customers';

  @override
  String get dashboardActiveLoans => 'Active loans';

  @override
  String get dashboardOutstandingCredit => 'Outstanding credit';

  @override
  String get dashboardSyncing => 'Syncing...';

  @override
  String dashboardSyncedOffline(int count) {
    return 'Synced $count offline item(s)';
  }

  @override
  String dashboardPendingSync(int count) {
    return '$count item(s) pending sync — check connection';
  }

  @override
  String get posTitle => 'Point of Sale';

  @override
  String get posCart => 'Cart';

  @override
  String get posTotal => 'Total';

  @override
  String get posTapProducts => 'Tap products to add to cart';

  @override
  String get posNoProducts => 'No products found';

  @override
  String get posCompleteSale => 'Complete Sale';

  @override
  String get posSaleCompleted => 'Sale completed!';

  @override
  String get posNoNetwork => 'No network — sale saved. Will sync when online.';

  @override
  String get posAdd => 'Add';

  @override
  String get posSearchProducts => 'Search products';

  @override
  String get posPaymentMethod => 'Payment Method';

  @override
  String get posCash => 'Cash';

  @override
  String get posMobileMoney => 'Mobile Money';

  @override
  String get posCredit => 'Credit (Deni)';

  @override
  String get posAmountPaid => 'Amount Paid';

  @override
  String get posChange => 'Change';

  @override
  String get posSelectCustomer => 'Select Customer';

  @override
  String get posNoCustomer => 'No Customer';

  @override
  String get posNewCustomer => 'New Customer';

  @override
  String get posQuantity => 'Quantity';

  @override
  String get posUnit => 'Unit';

  @override
  String get posReceipt => 'Receipt';

  @override
  String get posShareReceipt => 'Share Receipt';

  @override
  String get posReprint => 'Reprint';

  @override
  String get posCustomerName => 'Customer Name';

  @override
  String get posCustomerPhone => 'Customer Phone';

  @override
  String get posTendered => 'Tendered';

  @override
  String get posItems => 'Items';

  @override
  String get posSubtotal => 'Subtotal';

  @override
  String get posDiscount => 'Discount';

  @override
  String get posGrandTotal => 'Grand Total';

  @override
  String get posPayment => 'Payment';

  @override
  String get posPaymentInsufficient => 'Payment is less than the sale total';

  @override
  String get posSaleRefunded => 'Sale refunded';

  @override
  String get posSaleVoided => 'Sale voided';

  @override
  String get posViewHistory => 'View History';

  @override
  String get posTransactionHistory => 'Transaction History';

  @override
  String get posNoSales => 'No sales yet';

  @override
  String get inventoryTitle => 'Inventory';

  @override
  String get inventorySearchProducts => 'Search Products';

  @override
  String get inventorySearchHint => 'Search by name or SKU';

  @override
  String get inventoryNoProducts => 'No products found';

  @override
  String get inventoryAddProduct => 'Add Product';

  @override
  String get inventoryProductName => 'Product Name';

  @override
  String get inventorySku => 'SKU';

  @override
  String get inventoryCostPrice => 'Cost Price';

  @override
  String get inventorySellingPrice => 'Selling Price';

  @override
  String get inventoryStockQty => 'Stock Qty';

  @override
  String get inventoryReorderLevel => 'Reorder Level';

  @override
  String get inventorySaveProduct => 'Save Product';

  @override
  String get inventoryProductAdded => 'Product added';

  @override
  String get inventoryProductUpdated => 'Product updated';

  @override
  String get inventoryLowStock => 'Low Stock';

  @override
  String get inventoryAdjustStock => 'Adjust Stock';

  @override
  String get inventoryStockHistory => 'Stock History';

  @override
  String get inventoryCategories => 'Categories';

  @override
  String get inventoryCategory => 'Category';

  @override
  String get inventoryUnit => 'Unit';

  @override
  String get inventoryReceiveStock => 'Receive Stock';

  @override
  String get inventoryDamagedStock => 'Damaged Stock';

  @override
  String get inventoryLostStock => 'Lost Stock';

  @override
  String get inventoryStockValue => 'Stock Value';

  @override
  String get inventoryEditProduct => 'Edit Product';

  @override
  String get inventoryArchive => 'Archive';

  @override
  String get inventoryCurrentStock => 'Current Stock';

  @override
  String get inventoryNewStock => 'New Stock';

  @override
  String get inventoryReason => 'Reason';

  @override
  String get inventoryStockAdjusted => 'Stock adjusted';

  @override
  String get inventoryInStock => 'Stock';

  @override
  String get inventoryTotalValue => 'Total Value';

  @override
  String get inventoryTotalRetailValue => 'Total Retail Value';

  @override
  String get inventoryTotalProducts => 'Total Products';

  @override
  String get inventoryFastMoving => 'Fast-moving';

  @override
  String get inventorySlowMoving => 'Slow-moving';

  @override
  String get customersTitle => 'Customers & Credit';

  @override
  String get customersAddCustomer => 'Add Customer';

  @override
  String get customersFullName => 'Full Name';

  @override
  String get customersPhone => 'Phone';

  @override
  String get customersAddress => 'Address';

  @override
  String get customersSaveCustomer => 'Save Customer';

  @override
  String get customersCustomerAdded => 'Customer added';

  @override
  String get customersCustomerUpdated => 'Customer updated';

  @override
  String get customersNoCustomers => 'No customers yet';

  @override
  String customersOutstanding(String amount) {
    return 'Outstanding: $amount';
  }

  @override
  String get customersOutstandingBalance => 'Outstanding Balance';

  @override
  String get customersRecordPayment => 'Record Credit Payment';

  @override
  String get customersPurchaseHistory => 'Purchase History';

  @override
  String get customersNoPurchases => 'No purchases yet';

  @override
  String get customersPayment => 'Payment';

  @override
  String get customersPaymentRecorded => 'Payment recorded';

  @override
  String get customersAmount => 'Amount';

  @override
  String get customersEditCustomer => 'Edit Customer';

  @override
  String get customersCreditHistory => 'Credit History';

  @override
  String get customersOverdue => 'Overdue credit';

  @override
  String customersOwes(String name, String amount) {
    return '$name owes $amount';
  }

  @override
  String get customersSearch => 'Search customer';

  @override
  String get expensesTitle => 'Expenses';

  @override
  String get expensesAddExpense => 'Add Expense';

  @override
  String get expensesCategory => 'Category';

  @override
  String get expensesAmount => 'Amount';

  @override
  String get expensesDescription => 'Description';

  @override
  String get expensesSaveExpense => 'Save Expense';

  @override
  String get expensesExpenseRecorded => 'Expense recorded';

  @override
  String get expensesExpenseUpdated => 'Expense updated';

  @override
  String get expensesNoExpenses => 'No expenses yet';

  @override
  String get expensesEditExpense => 'Edit Expense';

  @override
  String get expensesFilter => 'Filter';

  @override
  String get expensesTotal => 'Total Expenses';

  @override
  String get loansTitle => 'Loans';

  @override
  String get loansAddLoan => 'Add Loan';

  @override
  String get loansLender => 'Lender';

  @override
  String get loansAmount => 'Amount';

  @override
  String get loansInterest => 'Interest %';

  @override
  String get loansDueDate => 'Due Date';

  @override
  String get loansSaveLoan => 'Save Loan';

  @override
  String get loansLoanCreated => 'Loan created';

  @override
  String get loansNoLoans => 'No loans yet';

  @override
  String get loansBalance => 'Balance';

  @override
  String get loansPaid => 'Paid';

  @override
  String get loansActive => 'Active';

  @override
  String get loansRecordRepayment => 'Record Repayment';

  @override
  String get loansRepaymentRecorded => 'Repayment recorded';

  @override
  String get loansRemaining => 'Remaining';

  @override
  String get loansTotalBorrowed => 'Total Borrowed';

  @override
  String get loansTotalOutstanding => 'Total Outstanding';

  @override
  String get loansTotalRepaid => 'Total Repaid';

  @override
  String get employeesTitle => 'Employees';

  @override
  String get employeesAddEmployee => 'Add Employee';

  @override
  String get employeesFullName => 'Full Name';

  @override
  String get employeesPhone => 'Phone';

  @override
  String get employeesRole => 'Role';

  @override
  String get employeesAdd => 'Add Employee';

  @override
  String get employeesEmployeeAdded => 'Employee added. SMS sent.';

  @override
  String get employeesNoEmployees => 'No employees yet';

  @override
  String get employeesOnlyOwners => 'Only business owners can manage employees';

  @override
  String get employeesCashier => 'Cashier';

  @override
  String get employeesShopEmployee => 'Shop Employee';

  @override
  String get employeesStockClerk => 'Stock Clerk';

  @override
  String get employeesManager => 'Manager';

  @override
  String get employeesActive => 'Active';

  @override
  String get employeesInactive => 'Inactive';

  @override
  String get employeesResetPin => 'Reset PIN';

  @override
  String get employeesRemove => 'Remove';

  @override
  String get employeesActivity => 'Employee Activity';

  @override
  String get reportsTitle => 'Reports';

  @override
  String get reportsSalesReport => 'Sales Report';

  @override
  String get reportsInventoryValuation => 'Inventory Valuation';

  @override
  String get reportsProfitReport => 'Profit Report';

  @override
  String get reportsExpenseReport => 'Expense Report';

  @override
  String get reportsCreditReport => 'Credit Report';

  @override
  String get reportsLoanReport => 'Loan Report';

  @override
  String get reportsCashflowReport => 'Cashflow Report';

  @override
  String get reportsEmployeeReport => 'Employee Report';

  @override
  String get reportsPaymentMethodsReport => 'Payment Methods';

  @override
  String get reportsTotalSales => 'Total Sales';

  @override
  String get reportsTransactions => 'Transactions';

  @override
  String get reportsTotalItems => 'Total Items';

  @override
  String get reportsAvgTicket => 'Avg Ticket';

  @override
  String get reportsRecentSales => 'Recent Sales';

  @override
  String get reportsAvailableReports => 'Available Reports';

  @override
  String get reportsThisMonth => 'This Month';

  @override
  String get reportsDaily => 'Daily';

  @override
  String get reportsWeekly => 'Weekly';

  @override
  String get reportsMonthly => 'Monthly';

  @override
  String get reportsYearly => 'Yearly';

  @override
  String get reportsCustom => 'Custom Range';

  @override
  String get reportsToday => 'Today';

  @override
  String get reportsYesterday => 'Yesterday';

  @override
  String get reportsThisWeek => 'This Week';

  @override
  String get reportsPreviousWeek => 'Previous Week';

  @override
  String get reportsFrom => 'From';

  @override
  String get reportsTo => 'To';

  @override
  String get reportsSelectPeriod => 'Select Period';

  @override
  String get reportsTotalRevenue => 'Total Revenue';

  @override
  String get reportsTotalDiscounts => 'Total Discounts';

  @override
  String get reportsTotalExpenses => 'Total Expenses';

  @override
  String get reportsEstimatedProfit => 'Estimated Profit';

  @override
  String get reportsByCategory => 'By Category';

  @override
  String get reportsTotalValue => 'Total Value';

  @override
  String get reportsTotalRetailValue => 'Total Retail Value';

  @override
  String get reportsTotalProducts => 'Total Products';

  @override
  String get reportsTotalOutstanding => 'Total Outstanding';

  @override
  String get reportsCustomersWithDebt => 'Customers with Debt';

  @override
  String get reportsTotalBorrowed => 'Total Borrowed';

  @override
  String get reportsTotalRepaid => 'Total Repaid';

  @override
  String get reportsNetCashFlow => 'Net Cash Flow';

  @override
  String get reportsTotalInflow => 'Total Inflow';

  @override
  String get reportsTotalOutflow => 'Total Outflow';

  @override
  String get reportsCreditCollections => 'Credit Collections';

  @override
  String get reportsNoData => 'No data for the selected period';

  @override
  String get reportsLoadError => 'Failed to load report';

  @override
  String get moreTitle => 'More';

  @override
  String get moreBusiness => 'Business';

  @override
  String get moreFinancial => 'Financial';

  @override
  String get moreSystem => 'System';

  @override
  String get moreAccount => 'Account';

  @override
  String get moreEmployees => 'Employees';

  @override
  String get moreReceiptSettings => 'Receipt Settings';

  @override
  String get moreExpenses => 'Expenses';

  @override
  String get moreCustomersCredit => 'Customers & Credit';

  @override
  String get moreLoans => 'Loans';

  @override
  String get moreSyncStatus => 'Sync Status';

  @override
  String get moreBackup => 'Backup';

  @override
  String get moreChangePin => 'Change PIN';

  @override
  String get moreAbout => 'About';

  @override
  String get moreLogout => 'Logout';

  @override
  String moreLoggedInAs(String name) {
    return 'Logged in as $name';
  }

  @override
  String get moreShops => 'Shops';

  @override
  String get moreManageShops => 'Manage Shops';

  @override
  String get moreBusinessSettings => 'Business Settings';

  @override
  String get moreNotifications => 'Notifications';

  @override
  String get moreSupport => 'Support';

  @override
  String get moreLanguage => 'Language';

  @override
  String get moreSyncNow => 'Sync Now';

  @override
  String get morePendingOffline => 'Pending offline';

  @override
  String get moreLastPull => 'Last pull';

  @override
  String get moreLastPush => 'Last push';

  @override
  String get moreComingSoon => 'Coming soon';

  @override
  String moreSyncedCount(int pushed, int failed) {
    return 'Synced $pushed item(s). $failed failed.';
  }

  @override
  String moreSyncFailed(int pending) {
    return 'Sync failed: $pending pending';
  }

  @override
  String get moreNoShop => 'No shop available';

  @override
  String get moreCouldNotReachSync => 'Could not reach sync service';

  @override
  String get shopTitle => 'Shops';

  @override
  String get shopAddShop => 'Add Shop';

  @override
  String get shopName => 'Shop Name';

  @override
  String get shopAddress => 'Address';

  @override
  String get shopCurrency => 'Currency';

  @override
  String get shopSaveShop => 'Save Shop';

  @override
  String get shopShopCreated => 'Shop created';

  @override
  String get shopShopUpdated => 'Shop updated';

  @override
  String get shopArchive => 'Archive';

  @override
  String get shopNoShops => 'No shops';

  @override
  String get shopSwitchShop => 'Switch Shop';

  @override
  String get shopAllShops => 'All Shops';

  @override
  String get shopActive => 'Active';

  @override
  String get shopArchived => 'Archived';

  @override
  String get shopSelectShop => 'Select Shop';

  @override
  String get shopCurrent => 'Current Shop';

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get notificationsNoNotifications => 'No notifications';

  @override
  String get notificationsMarkAllRead => 'Mark all as read';

  @override
  String get notificationsMarkRead => 'Mark as read';

  @override
  String get supportTitle => 'Support';

  @override
  String get supportContact => 'Support Contact';

  @override
  String get supportDescription => 'For assistance, please contact us via:';

  @override
  String get supportEmail => 'Email';

  @override
  String get supportPhone => 'Phone';

  @override
  String get supportNoContact => 'No support contact configured';

  @override
  String get profileTitle => 'Profile';

  @override
  String get profileEdit => 'Edit Profile';

  @override
  String get profileName => 'Name';

  @override
  String get profileRole => 'Role';

  @override
  String get profileUpdated => 'Profile updated';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorNetwork => 'No network connection.';

  @override
  String get errorUnauthorized => 'You are not allowed to perform this action.';

  @override
  String get errorForbidden =>
      'You do not have permission to perform this action.';

  @override
  String get errorNotFound => 'Nothing was found.';

  @override
  String get errorValidation => 'Please check the information you entered.';

  @override
  String get errorStockNegative => 'Stock cannot be negative';

  @override
  String get errorInsufficientStock => 'Insufficient stock';

  @override
  String get supportMyTickets => 'My Support Tickets';

  @override
  String get supportNoTickets => 'No tickets yet';

  @override
  String get supportNewTicket => 'New Ticket';

  @override
  String get supportSubject => 'Subject';

  @override
  String get supportMessage => 'Message';

  @override
  String get supportPriority => 'Priority';

  @override
  String get supportSubmit => 'Submit';

  @override
  String get supportTicketCreated => 'Ticket submitted';

  @override
  String get supportReply => 'Reply';

  @override
  String get supportReplies => 'Replies';

  @override
  String get supportStatus => 'Status';

  @override
  String get supportStatusOpen => 'Open';

  @override
  String get supportStatusResolved => 'Resolved';

  @override
  String get supportStatusClosed => 'Closed';

  @override
  String get supportSendReply => 'Send reply';

  @override
  String get supportTypeReply => 'Type a reply...';

  @override
  String get receiptTitle => 'Receipt Settings';

  @override
  String get receiptHeader => 'Receipt header';

  @override
  String get receiptFooter => 'Receipt footer';

  @override
  String get receiptTaxNumber => 'Tax number (TIN)';

  @override
  String get receiptCurrency => 'Currency';

  @override
  String get receiptLanguage => 'Language';

  @override
  String get receiptPrinter => 'Printer';

  @override
  String get receiptPrinterType => 'Printer type';

  @override
  String get receiptPrinterBluetooth => 'Bluetooth';

  @override
  String get receiptPrinterNone => 'None';

  @override
  String get receiptUpdated => 'Settings saved';

  @override
  String get receiptLoadError => 'Failed to load settings';

  @override
  String get reportsExport => 'Export';

  @override
  String get reportsExportPdf => 'PDF';

  @override
  String get reportsExportExcel => 'Excel';

  @override
  String get reportsExportCsv => 'CSV';

  @override
  String get reportsExporting => 'Preparing file...';

  @override
  String get reportsExportSuccess => 'Report downloaded';

  @override
  String get reportsExportError => 'Failed to export report';

  @override
  String get reportsChooseFormat => 'Choose file format';
}
