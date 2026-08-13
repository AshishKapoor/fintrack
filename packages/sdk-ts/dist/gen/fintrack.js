"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v1FinanceBackupsList = exports.getV1FinanceBackupsListUrl = exports.v1FinanceAccountsDestroy = exports.getV1FinanceAccountsDestroyUrl = exports.v1FinanceAccountsPartialUpdate = exports.getV1FinanceAccountsPartialUpdateUrl = exports.v1FinanceAccountsUpdate = exports.getV1FinanceAccountsUpdateUrl = exports.v1FinanceAccountsRetrieve = exports.getV1FinanceAccountsRetrieveUrl = exports.v1FinanceAccountsCreate = exports.getV1FinanceAccountsCreateUrl = exports.v1FinanceAccountsList = exports.getV1FinanceAccountsListUrl = exports.v1CategoriesDestroy = exports.getV1CategoriesDestroyUrl = exports.v1CategoriesPartialUpdate = exports.getV1CategoriesPartialUpdateUrl = exports.v1CategoriesUpdate = exports.getV1CategoriesUpdateUrl = exports.v1CategoriesRetrieve = exports.getV1CategoriesRetrieveUrl = exports.v1CategoriesCreate = exports.getV1CategoriesCreateUrl = exports.v1CategoriesList = exports.getV1CategoriesListUrl = exports.v1BudgetsDestroy = exports.getV1BudgetsDestroyUrl = exports.v1BudgetsPartialUpdate = exports.getV1BudgetsPartialUpdateUrl = exports.v1BudgetsUpdate = exports.getV1BudgetsUpdateUrl = exports.v1BudgetsRetrieve = exports.getV1BudgetsRetrieveUrl = exports.v1BudgetsCreate = exports.getV1BudgetsCreateUrl = exports.v1BudgetsList = exports.getV1BudgetsListUrl = exports.v1AuditLogExportRetrieve = exports.getV1AuditLogExportRetrieveUrl = exports.v1AuditLogRetrieve = exports.getV1AuditLogRetrieveUrl = exports.v1AuditLogList = exports.getV1AuditLogListUrl = exports.tokenRefreshCreate = exports.getTokenRefreshCreateUrl = exports.tokenLogoutCreate = exports.getTokenLogoutCreateUrl = exports.tokenCreate = exports.getTokenCreateUrl = void 0;
exports.v1FinanceCategoriesList = exports.getV1FinanceCategoriesListUrl = exports.v1FinanceBudgetMonthsZeroOutCreate = exports.getV1FinanceBudgetMonthsZeroOutCreateUrl = exports.v1FinanceBudgetMonthsThreeMonthAverageCreate = exports.getV1FinanceBudgetMonthsThreeMonthAverageCreateUrl = exports.v1FinanceBudgetMonthsSnapshotRetrieve = exports.getV1FinanceBudgetMonthsSnapshotRetrieveUrl = exports.v1FinanceBudgetMonthsCopyPreviousCreate = exports.getV1FinanceBudgetMonthsCopyPreviousCreateUrl = exports.v1FinanceBudgetMonthsDestroy = exports.getV1FinanceBudgetMonthsDestroyUrl = exports.v1FinanceBudgetMonthsPartialUpdate = exports.getV1FinanceBudgetMonthsPartialUpdateUrl = exports.v1FinanceBudgetMonthsUpdate = exports.getV1FinanceBudgetMonthsUpdateUrl = exports.v1FinanceBudgetMonthsRetrieve = exports.getV1FinanceBudgetMonthsRetrieveUrl = exports.v1FinanceBudgetMonthsCreate = exports.getV1FinanceBudgetMonthsCreateUrl = exports.v1FinanceBudgetMonthsList = exports.getV1FinanceBudgetMonthsListUrl = exports.v1FinanceBudgetFilesSetDefaultCreate = exports.getV1FinanceBudgetFilesSetDefaultCreateUrl = exports.v1FinanceBudgetFilesBalancesRetrieve = exports.getV1FinanceBudgetFilesBalancesRetrieveUrl = exports.v1FinanceBudgetFilesDestroy = exports.getV1FinanceBudgetFilesDestroyUrl = exports.v1FinanceBudgetFilesPartialUpdate = exports.getV1FinanceBudgetFilesPartialUpdateUrl = exports.v1FinanceBudgetFilesUpdate = exports.getV1FinanceBudgetFilesUpdateUrl = exports.v1FinanceBudgetFilesRetrieve = exports.getV1FinanceBudgetFilesRetrieveUrl = exports.v1FinanceBudgetFilesCreate = exports.getV1FinanceBudgetFilesCreateUrl = exports.v1FinanceBudgetFilesList = exports.getV1FinanceBudgetFilesListUrl = exports.v1FinanceBackupsLatestRetrieve = exports.getV1FinanceBackupsLatestRetrieveUrl = exports.v1FinanceBackupsDestroy = exports.getV1FinanceBackupsDestroyUrl = exports.v1FinanceBackupsPartialUpdate = exports.getV1FinanceBackupsPartialUpdateUrl = exports.v1FinanceBackupsUpdate = exports.getV1FinanceBackupsUpdateUrl = exports.v1FinanceBackupsRetrieve = exports.getV1FinanceBackupsRetrieveUrl = exports.v1FinanceBackupsCreate = exports.getV1FinanceBackupsCreateUrl = void 0;
exports.v1FinanceImportsList = exports.getV1FinanceImportsListUrl = exports.v1FinanceExportsDownloadRetrieve = exports.getV1FinanceExportsDownloadRetrieveUrl = exports.v1FinanceExportsDestroy = exports.getV1FinanceExportsDestroyUrl = exports.v1FinanceExportsPartialUpdate = exports.getV1FinanceExportsPartialUpdateUrl = exports.v1FinanceExportsUpdate = exports.getV1FinanceExportsUpdateUrl = exports.v1FinanceExportsRetrieve = exports.getV1FinanceExportsRetrieveUrl = exports.v1FinanceExportsCreate = exports.getV1FinanceExportsCreateUrl = exports.v1FinanceExportsList = exports.getV1FinanceExportsListUrl = exports.v1FinanceEnvelopeAssignmentsDestroy = exports.getV1FinanceEnvelopeAssignmentsDestroyUrl = exports.v1FinanceEnvelopeAssignmentsPartialUpdate = exports.getV1FinanceEnvelopeAssignmentsPartialUpdateUrl = exports.v1FinanceEnvelopeAssignmentsUpdate = exports.getV1FinanceEnvelopeAssignmentsUpdateUrl = exports.v1FinanceEnvelopeAssignmentsRetrieve = exports.getV1FinanceEnvelopeAssignmentsRetrieveUrl = exports.v1FinanceEnvelopeAssignmentsCreate = exports.getV1FinanceEnvelopeAssignmentsCreateUrl = exports.v1FinanceEnvelopeAssignmentsList = exports.getV1FinanceEnvelopeAssignmentsListUrl = exports.v1FinanceCategoryGroupsDestroy = exports.getV1FinanceCategoryGroupsDestroyUrl = exports.v1FinanceCategoryGroupsPartialUpdate = exports.getV1FinanceCategoryGroupsPartialUpdateUrl = exports.v1FinanceCategoryGroupsUpdate = exports.getV1FinanceCategoryGroupsUpdateUrl = exports.v1FinanceCategoryGroupsRetrieve = exports.getV1FinanceCategoryGroupsRetrieveUrl = exports.v1FinanceCategoryGroupsCreate = exports.getV1FinanceCategoryGroupsCreateUrl = exports.v1FinanceCategoryGroupsList = exports.getV1FinanceCategoryGroupsListUrl = exports.v1FinanceCategoriesDestroy = exports.getV1FinanceCategoriesDestroyUrl = exports.v1FinanceCategoriesPartialUpdate = exports.getV1FinanceCategoriesPartialUpdateUrl = exports.v1FinanceCategoriesUpdate = exports.getV1FinanceCategoriesUpdateUrl = exports.v1FinanceCategoriesRetrieve = exports.getV1FinanceCategoriesRetrieveUrl = exports.v1FinanceCategoriesCreate = exports.getV1FinanceCategoriesCreateUrl = void 0;
exports.v1FinanceRulesCreate = exports.getV1FinanceRulesCreateUrl = exports.v1FinanceRulesList = exports.getV1FinanceRulesListUrl = exports.v1FinanceReportsRunCreate = exports.getV1FinanceReportsRunCreateUrl = exports.v1FinanceReportsRunCreate2 = exports.getV1FinanceReportsRunCreate2Url = exports.v1FinanceReportsDestroy = exports.getV1FinanceReportsDestroyUrl = exports.v1FinanceReportsPartialUpdate = exports.getV1FinanceReportsPartialUpdateUrl = exports.v1FinanceReportsUpdate = exports.getV1FinanceReportsUpdateUrl = exports.v1FinanceReportsRetrieve = exports.getV1FinanceReportsRetrieveUrl = exports.v1FinanceReportsCreate = exports.getV1FinanceReportsCreateUrl = exports.v1FinanceReportsList = exports.getV1FinanceReportsListUrl = exports.v1FinancePostingsRetrieve = exports.getV1FinancePostingsRetrieveUrl = exports.v1FinancePostingsList = exports.getV1FinancePostingsListUrl = exports.v1FinancePayeesDestroy = exports.getV1FinancePayeesDestroyUrl = exports.v1FinancePayeesPartialUpdate = exports.getV1FinancePayeesPartialUpdateUrl = exports.v1FinancePayeesUpdate = exports.getV1FinancePayeesUpdateUrl = exports.v1FinancePayeesRetrieve = exports.getV1FinancePayeesRetrieveUrl = exports.v1FinancePayeesCreate = exports.getV1FinancePayeesCreateUrl = exports.v1FinancePayeesList = exports.getV1FinancePayeesListUrl = exports.v1FinanceImportsPreviewCreate = exports.getV1FinanceImportsPreviewCreateUrl = exports.v1FinanceImportsExecuteCreate = exports.getV1FinanceImportsExecuteCreateUrl = exports.v1FinanceImportsDestroy = exports.getV1FinanceImportsDestroyUrl = exports.v1FinanceImportsPartialUpdate = exports.getV1FinanceImportsPartialUpdateUrl = exports.v1FinanceImportsUpdate = exports.getV1FinanceImportsUpdateUrl = exports.v1FinanceImportsRetrieve = exports.getV1FinanceImportsRetrieveUrl = exports.v1FinanceImportsCreate = exports.getV1FinanceImportsCreateUrl = void 0;
exports.v1FinanceTransactionsApplyRulesCreate = exports.getV1FinanceTransactionsApplyRulesCreateUrl = exports.v1FinanceTransactionsDestroy = exports.getV1FinanceTransactionsDestroyUrl = exports.v1FinanceTransactionsPartialUpdate = exports.getV1FinanceTransactionsPartialUpdateUrl = exports.v1FinanceTransactionsUpdate = exports.getV1FinanceTransactionsUpdateUrl = exports.v1FinanceTransactionsRetrieve = exports.getV1FinanceTransactionsRetrieveUrl = exports.v1FinanceTransactionsCreate = exports.getV1FinanceTransactionsCreateUrl = exports.v1FinanceTransactionsList = exports.getV1FinanceTransactionsListUrl = exports.v1FinanceTagsDestroy = exports.getV1FinanceTagsDestroyUrl = exports.v1FinanceTagsPartialUpdate = exports.getV1FinanceTagsPartialUpdateUrl = exports.v1FinanceTagsUpdate = exports.getV1FinanceTagsUpdateUrl = exports.v1FinanceTagsRetrieve = exports.getV1FinanceTagsRetrieveUrl = exports.v1FinanceTagsCreate = exports.getV1FinanceTagsCreateUrl = exports.v1FinanceTagsList = exports.getV1FinanceTagsListUrl = exports.v1FinanceScheduledTransactionsRunDueCreate = exports.getV1FinanceScheduledTransactionsRunDueCreateUrl = exports.v1FinanceScheduledTransactionsDestroy = exports.getV1FinanceScheduledTransactionsDestroyUrl = exports.v1FinanceScheduledTransactionsPartialUpdate = exports.getV1FinanceScheduledTransactionsPartialUpdateUrl = exports.v1FinanceScheduledTransactionsUpdate = exports.getV1FinanceScheduledTransactionsUpdateUrl = exports.v1FinanceScheduledTransactionsRetrieve = exports.getV1FinanceScheduledTransactionsRetrieveUrl = exports.v1FinanceScheduledTransactionsCreate = exports.getV1FinanceScheduledTransactionsCreateUrl = exports.v1FinanceScheduledTransactionsList = exports.getV1FinanceScheduledTransactionsListUrl = exports.v1FinanceRulesApplyCreate = exports.getV1FinanceRulesApplyCreateUrl = exports.v1FinanceRulesDestroy = exports.getV1FinanceRulesDestroyUrl = exports.v1FinanceRulesPartialUpdate = exports.getV1FinanceRulesPartialUpdateUrl = exports.v1FinanceRulesUpdate = exports.getV1FinanceRulesUpdateUrl = exports.v1FinanceRulesRetrieve = exports.getV1FinanceRulesRetrieveUrl = void 0;
exports.v1TransactionsDestroy = exports.getV1TransactionsDestroyUrl = exports.v1TransactionsPartialUpdate = exports.getV1TransactionsPartialUpdateUrl = exports.v1TransactionsUpdate = exports.getV1TransactionsUpdateUrl = exports.v1TransactionsRetrieve = exports.getV1TransactionsRetrieveUrl = exports.v1TransactionsCreate = exports.getV1TransactionsCreateUrl = exports.v1TransactionsList = exports.getV1TransactionsListUrl = exports.v1RegisterCreate = exports.getV1RegisterCreateUrl = exports.v1ProfileUpdatePartialUpdate = exports.getV1ProfileUpdatePartialUpdateUrl = exports.v1ProfileUpdateUpdate = exports.getV1ProfileUpdateUpdateUrl = exports.v1ProfileDeleteAccountCreate = exports.getV1ProfileDeleteAccountCreateUrl = exports.v1ProfileChangePasswordCreate = exports.getV1ProfileChangePasswordCreateUrl = exports.v1OrgsAcceptInvitationCreate = exports.getV1OrgsAcceptInvitationCreateUrl = exports.v1OrgsMembersRemoveDestroy = exports.getV1OrgsMembersRemoveDestroyUrl = exports.v1OrgsMembersPartialUpdate = exports.getV1OrgsMembersPartialUpdateUrl = exports.v1OrgsMembersRetrieve = exports.getV1OrgsMembersRetrieveUrl = exports.v1OrgsInvitationsCreate = exports.getV1OrgsInvitationsCreateUrl = exports.v1OrgsInvitationsRetrieve = exports.getV1OrgsInvitationsRetrieveUrl = exports.v1OrgsDestroy = exports.getV1OrgsDestroyUrl = exports.v1OrgsPartialUpdate = exports.getV1OrgsPartialUpdateUrl = exports.v1OrgsUpdate = exports.getV1OrgsUpdateUrl = exports.v1OrgsRetrieve = exports.getV1OrgsRetrieveUrl = exports.v1OrgsCreate = exports.getV1OrgsCreateUrl = exports.v1OrgsList = exports.getV1OrgsListUrl = exports.v1MeRetrieve = exports.getV1MeRetrieveUrl = exports.v1FinanceTransactionsBulkUpdateCreate = exports.getV1FinanceTransactionsBulkUpdateCreateUrl = void 0;
const mutator_1 = require("../mutator");
;
const getTokenCreateUrl = () => {
    return `/api/token/`;
};
exports.getTokenCreateUrl = getTokenCreateUrl;
const tokenCreate = async (tokenObtainPair, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getTokenCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(tokenObtainPair)
    });
};
exports.tokenCreate = tokenCreate;
;
const getTokenLogoutCreateUrl = () => {
    return `/api/token/logout/`;
};
exports.getTokenLogoutCreateUrl = getTokenLogoutCreateUrl;
const tokenLogoutCreate = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getTokenLogoutCreateUrl)(), {
        ...options,
        method: 'POST'
    });
};
exports.tokenLogoutCreate = tokenLogoutCreate;
;
const getTokenRefreshCreateUrl = () => {
    return `/api/token/refresh/`;
};
exports.getTokenRefreshCreateUrl = getTokenRefreshCreateUrl;
const tokenRefreshCreate = async (tokenRefresh, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getTokenRefreshCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(tokenRefresh)
    });
};
exports.tokenRefreshCreate = tokenRefreshCreate;
;
const getV1AuditLogListUrl = (params) => {
    const normalizedParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined) {
            normalizedParams.append(key, value === null ? 'null' : value.toString());
        }
    });
    const stringifiedParams = normalizedParams.toString();
    return stringifiedParams.length > 0 ? `/api/v1/audit-log/?${stringifiedParams}` : `/api/v1/audit-log/`;
};
exports.getV1AuditLogListUrl = getV1AuditLogListUrl;
const v1AuditLogList = async (params, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1AuditLogListUrl)(params), {
        ...options,
        method: 'GET'
    });
};
exports.v1AuditLogList = v1AuditLogList;
;
const getV1AuditLogRetrieveUrl = (id) => {
    return `/api/v1/audit-log/${id}/`;
};
exports.getV1AuditLogRetrieveUrl = getV1AuditLogRetrieveUrl;
const v1AuditLogRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1AuditLogRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1AuditLogRetrieve = v1AuditLogRetrieve;
;
const getV1AuditLogExportRetrieveUrl = () => {
    return `/api/v1/audit-log/export/`;
};
exports.getV1AuditLogExportRetrieveUrl = getV1AuditLogExportRetrieveUrl;
const v1AuditLogExportRetrieve = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1AuditLogExportRetrieveUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1AuditLogExportRetrieve = v1AuditLogExportRetrieve;
;
const getV1BudgetsListUrl = (params) => {
    const normalizedParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined) {
            normalizedParams.append(key, value === null ? 'null' : value.toString());
        }
    });
    const stringifiedParams = normalizedParams.toString();
    return stringifiedParams.length > 0 ? `/api/v1/budgets/?${stringifiedParams}` : `/api/v1/budgets/`;
};
exports.getV1BudgetsListUrl = getV1BudgetsListUrl;
const v1BudgetsList = async (params, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1BudgetsListUrl)(params), {
        ...options,
        method: 'GET'
    });
};
exports.v1BudgetsList = v1BudgetsList;
;
const getV1BudgetsCreateUrl = () => {
    return `/api/v1/budgets/`;
};
exports.getV1BudgetsCreateUrl = getV1BudgetsCreateUrl;
const v1BudgetsCreate = async (budget, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1BudgetsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budget)
    });
};
exports.v1BudgetsCreate = v1BudgetsCreate;
;
const getV1BudgetsRetrieveUrl = (id) => {
    return `/api/v1/budgets/${id}/`;
};
exports.getV1BudgetsRetrieveUrl = getV1BudgetsRetrieveUrl;
const v1BudgetsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1BudgetsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1BudgetsRetrieve = v1BudgetsRetrieve;
;
const getV1BudgetsUpdateUrl = (id) => {
    return `/api/v1/budgets/${id}/`;
};
exports.getV1BudgetsUpdateUrl = getV1BudgetsUpdateUrl;
const v1BudgetsUpdate = async (id, budget, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1BudgetsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budget)
    });
};
exports.v1BudgetsUpdate = v1BudgetsUpdate;
;
const getV1BudgetsPartialUpdateUrl = (id) => {
    return `/api/v1/budgets/${id}/`;
};
exports.getV1BudgetsPartialUpdateUrl = getV1BudgetsPartialUpdateUrl;
const v1BudgetsPartialUpdate = async (id, patchedBudget, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1BudgetsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedBudget)
    });
};
exports.v1BudgetsPartialUpdate = v1BudgetsPartialUpdate;
;
const getV1BudgetsDestroyUrl = (id) => {
    return `/api/v1/budgets/${id}/`;
};
exports.getV1BudgetsDestroyUrl = getV1BudgetsDestroyUrl;
const v1BudgetsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1BudgetsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1BudgetsDestroy = v1BudgetsDestroy;
;
const getV1CategoriesListUrl = (params) => {
    const normalizedParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined) {
            normalizedParams.append(key, value === null ? 'null' : value.toString());
        }
    });
    const stringifiedParams = normalizedParams.toString();
    return stringifiedParams.length > 0 ? `/api/v1/categories/?${stringifiedParams}` : `/api/v1/categories/`;
};
exports.getV1CategoriesListUrl = getV1CategoriesListUrl;
const v1CategoriesList = async (params, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1CategoriesListUrl)(params), {
        ...options,
        method: 'GET'
    });
};
exports.v1CategoriesList = v1CategoriesList;
;
const getV1CategoriesCreateUrl = () => {
    return `/api/v1/categories/`;
};
exports.getV1CategoriesCreateUrl = getV1CategoriesCreateUrl;
const v1CategoriesCreate = async (category, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1CategoriesCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(category)
    });
};
exports.v1CategoriesCreate = v1CategoriesCreate;
;
const getV1CategoriesRetrieveUrl = (id) => {
    return `/api/v1/categories/${id}/`;
};
exports.getV1CategoriesRetrieveUrl = getV1CategoriesRetrieveUrl;
const v1CategoriesRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1CategoriesRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1CategoriesRetrieve = v1CategoriesRetrieve;
;
const getV1CategoriesUpdateUrl = (id) => {
    return `/api/v1/categories/${id}/`;
};
exports.getV1CategoriesUpdateUrl = getV1CategoriesUpdateUrl;
const v1CategoriesUpdate = async (id, category, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1CategoriesUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(category)
    });
};
exports.v1CategoriesUpdate = v1CategoriesUpdate;
;
const getV1CategoriesPartialUpdateUrl = (id) => {
    return `/api/v1/categories/${id}/`;
};
exports.getV1CategoriesPartialUpdateUrl = getV1CategoriesPartialUpdateUrl;
const v1CategoriesPartialUpdate = async (id, patchedCategory, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1CategoriesPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedCategory)
    });
};
exports.v1CategoriesPartialUpdate = v1CategoriesPartialUpdate;
;
const getV1CategoriesDestroyUrl = (id) => {
    return `/api/v1/categories/${id}/`;
};
exports.getV1CategoriesDestroyUrl = getV1CategoriesDestroyUrl;
const v1CategoriesDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1CategoriesDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1CategoriesDestroy = v1CategoriesDestroy;
;
const getV1FinanceAccountsListUrl = () => {
    return `/api/v1/finance/accounts/`;
};
exports.getV1FinanceAccountsListUrl = getV1FinanceAccountsListUrl;
const v1FinanceAccountsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceAccountsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceAccountsList = v1FinanceAccountsList;
;
const getV1FinanceAccountsCreateUrl = () => {
    return `/api/v1/finance/accounts/`;
};
exports.getV1FinanceAccountsCreateUrl = getV1FinanceAccountsCreateUrl;
const v1FinanceAccountsCreate = async (account, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceAccountsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(account)
    });
};
exports.v1FinanceAccountsCreate = v1FinanceAccountsCreate;
;
const getV1FinanceAccountsRetrieveUrl = (id) => {
    return `/api/v1/finance/accounts/${id}/`;
};
exports.getV1FinanceAccountsRetrieveUrl = getV1FinanceAccountsRetrieveUrl;
const v1FinanceAccountsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceAccountsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceAccountsRetrieve = v1FinanceAccountsRetrieve;
;
const getV1FinanceAccountsUpdateUrl = (id) => {
    return `/api/v1/finance/accounts/${id}/`;
};
exports.getV1FinanceAccountsUpdateUrl = getV1FinanceAccountsUpdateUrl;
const v1FinanceAccountsUpdate = async (id, account, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceAccountsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(account)
    });
};
exports.v1FinanceAccountsUpdate = v1FinanceAccountsUpdate;
;
const getV1FinanceAccountsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/accounts/${id}/`;
};
exports.getV1FinanceAccountsPartialUpdateUrl = getV1FinanceAccountsPartialUpdateUrl;
const v1FinanceAccountsPartialUpdate = async (id, patchedAccount, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceAccountsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedAccount)
    });
};
exports.v1FinanceAccountsPartialUpdate = v1FinanceAccountsPartialUpdate;
;
const getV1FinanceAccountsDestroyUrl = (id) => {
    return `/api/v1/finance/accounts/${id}/`;
};
exports.getV1FinanceAccountsDestroyUrl = getV1FinanceAccountsDestroyUrl;
const v1FinanceAccountsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceAccountsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceAccountsDestroy = v1FinanceAccountsDestroy;
;
const getV1FinanceBackupsListUrl = () => {
    return `/api/v1/finance/backups/`;
};
exports.getV1FinanceBackupsListUrl = getV1FinanceBackupsListUrl;
const v1FinanceBackupsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBackupsList = v1FinanceBackupsList;
;
const getV1FinanceBackupsCreateUrl = () => {
    return `/api/v1/finance/backups/`;
};
exports.getV1FinanceBackupsCreateUrl = getV1FinanceBackupsCreateUrl;
const v1FinanceBackupsCreate = async (encryptedBackupBundle, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(encryptedBackupBundle)
    });
};
exports.v1FinanceBackupsCreate = v1FinanceBackupsCreate;
;
const getV1FinanceBackupsRetrieveUrl = (id) => {
    return `/api/v1/finance/backups/${id}/`;
};
exports.getV1FinanceBackupsRetrieveUrl = getV1FinanceBackupsRetrieveUrl;
const v1FinanceBackupsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBackupsRetrieve = v1FinanceBackupsRetrieve;
;
const getV1FinanceBackupsUpdateUrl = (id) => {
    return `/api/v1/finance/backups/${id}/`;
};
exports.getV1FinanceBackupsUpdateUrl = getV1FinanceBackupsUpdateUrl;
const v1FinanceBackupsUpdate = async (id, encryptedBackupBundle, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(encryptedBackupBundle)
    });
};
exports.v1FinanceBackupsUpdate = v1FinanceBackupsUpdate;
;
const getV1FinanceBackupsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/backups/${id}/`;
};
exports.getV1FinanceBackupsPartialUpdateUrl = getV1FinanceBackupsPartialUpdateUrl;
const v1FinanceBackupsPartialUpdate = async (id, patchedEncryptedBackupBundle, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedEncryptedBackupBundle)
    });
};
exports.v1FinanceBackupsPartialUpdate = v1FinanceBackupsPartialUpdate;
;
const getV1FinanceBackupsDestroyUrl = (id) => {
    return `/api/v1/finance/backups/${id}/`;
};
exports.getV1FinanceBackupsDestroyUrl = getV1FinanceBackupsDestroyUrl;
const v1FinanceBackupsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceBackupsDestroy = v1FinanceBackupsDestroy;
;
const getV1FinanceBackupsLatestRetrieveUrl = () => {
    return `/api/v1/finance/backups/latest/`;
};
exports.getV1FinanceBackupsLatestRetrieveUrl = getV1FinanceBackupsLatestRetrieveUrl;
const v1FinanceBackupsLatestRetrieve = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBackupsLatestRetrieveUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBackupsLatestRetrieve = v1FinanceBackupsLatestRetrieve;
;
const getV1FinanceBudgetFilesListUrl = () => {
    return `/api/v1/finance/budget-files/`;
};
exports.getV1FinanceBudgetFilesListUrl = getV1FinanceBudgetFilesListUrl;
const v1FinanceBudgetFilesList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBudgetFilesList = v1FinanceBudgetFilesList;
;
const getV1FinanceBudgetFilesCreateUrl = () => {
    return `/api/v1/finance/budget-files/`;
};
exports.getV1FinanceBudgetFilesCreateUrl = getV1FinanceBudgetFilesCreateUrl;
const v1FinanceBudgetFilesCreate = async (budgetFile, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetFile)
    });
};
exports.v1FinanceBudgetFilesCreate = v1FinanceBudgetFilesCreate;
;
const getV1FinanceBudgetFilesRetrieveUrl = (id) => {
    return `/api/v1/finance/budget-files/${id}/`;
};
exports.getV1FinanceBudgetFilesRetrieveUrl = getV1FinanceBudgetFilesRetrieveUrl;
const v1FinanceBudgetFilesRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBudgetFilesRetrieve = v1FinanceBudgetFilesRetrieve;
;
const getV1FinanceBudgetFilesUpdateUrl = (id) => {
    return `/api/v1/finance/budget-files/${id}/`;
};
exports.getV1FinanceBudgetFilesUpdateUrl = getV1FinanceBudgetFilesUpdateUrl;
const v1FinanceBudgetFilesUpdate = async (id, budgetFile, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetFile)
    });
};
exports.v1FinanceBudgetFilesUpdate = v1FinanceBudgetFilesUpdate;
;
const getV1FinanceBudgetFilesPartialUpdateUrl = (id) => {
    return `/api/v1/finance/budget-files/${id}/`;
};
exports.getV1FinanceBudgetFilesPartialUpdateUrl = getV1FinanceBudgetFilesPartialUpdateUrl;
const v1FinanceBudgetFilesPartialUpdate = async (id, patchedBudgetFile, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedBudgetFile)
    });
};
exports.v1FinanceBudgetFilesPartialUpdate = v1FinanceBudgetFilesPartialUpdate;
;
const getV1FinanceBudgetFilesDestroyUrl = (id) => {
    return `/api/v1/finance/budget-files/${id}/`;
};
exports.getV1FinanceBudgetFilesDestroyUrl = getV1FinanceBudgetFilesDestroyUrl;
const v1FinanceBudgetFilesDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceBudgetFilesDestroy = v1FinanceBudgetFilesDestroy;
;
const getV1FinanceBudgetFilesBalancesRetrieveUrl = (id) => {
    return `/api/v1/finance/budget-files/${id}/balances/`;
};
exports.getV1FinanceBudgetFilesBalancesRetrieveUrl = getV1FinanceBudgetFilesBalancesRetrieveUrl;
const v1FinanceBudgetFilesBalancesRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesBalancesRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBudgetFilesBalancesRetrieve = v1FinanceBudgetFilesBalancesRetrieve;
;
const getV1FinanceBudgetFilesSetDefaultCreateUrl = (id) => {
    return `/api/v1/finance/budget-files/${id}/set-default/`;
};
exports.getV1FinanceBudgetFilesSetDefaultCreateUrl = getV1FinanceBudgetFilesSetDefaultCreateUrl;
const v1FinanceBudgetFilesSetDefaultCreate = async (id, budgetFile, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetFilesSetDefaultCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetFile)
    });
};
exports.v1FinanceBudgetFilesSetDefaultCreate = v1FinanceBudgetFilesSetDefaultCreate;
;
const getV1FinanceBudgetMonthsListUrl = () => {
    return `/api/v1/finance/budget-months/`;
};
exports.getV1FinanceBudgetMonthsListUrl = getV1FinanceBudgetMonthsListUrl;
const v1FinanceBudgetMonthsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBudgetMonthsList = v1FinanceBudgetMonthsList;
;
const getV1FinanceBudgetMonthsCreateUrl = () => {
    return `/api/v1/finance/budget-months/`;
};
exports.getV1FinanceBudgetMonthsCreateUrl = getV1FinanceBudgetMonthsCreateUrl;
const v1FinanceBudgetMonthsCreate = async (budgetMonth, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetMonth)
    });
};
exports.v1FinanceBudgetMonthsCreate = v1FinanceBudgetMonthsCreate;
;
const getV1FinanceBudgetMonthsRetrieveUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/`;
};
exports.getV1FinanceBudgetMonthsRetrieveUrl = getV1FinanceBudgetMonthsRetrieveUrl;
const v1FinanceBudgetMonthsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBudgetMonthsRetrieve = v1FinanceBudgetMonthsRetrieve;
;
const getV1FinanceBudgetMonthsUpdateUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/`;
};
exports.getV1FinanceBudgetMonthsUpdateUrl = getV1FinanceBudgetMonthsUpdateUrl;
const v1FinanceBudgetMonthsUpdate = async (id, budgetMonth, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetMonth)
    });
};
exports.v1FinanceBudgetMonthsUpdate = v1FinanceBudgetMonthsUpdate;
;
const getV1FinanceBudgetMonthsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/`;
};
exports.getV1FinanceBudgetMonthsPartialUpdateUrl = getV1FinanceBudgetMonthsPartialUpdateUrl;
const v1FinanceBudgetMonthsPartialUpdate = async (id, patchedBudgetMonth, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedBudgetMonth)
    });
};
exports.v1FinanceBudgetMonthsPartialUpdate = v1FinanceBudgetMonthsPartialUpdate;
;
const getV1FinanceBudgetMonthsDestroyUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/`;
};
exports.getV1FinanceBudgetMonthsDestroyUrl = getV1FinanceBudgetMonthsDestroyUrl;
const v1FinanceBudgetMonthsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceBudgetMonthsDestroy = v1FinanceBudgetMonthsDestroy;
;
const getV1FinanceBudgetMonthsCopyPreviousCreateUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/copy-previous/`;
};
exports.getV1FinanceBudgetMonthsCopyPreviousCreateUrl = getV1FinanceBudgetMonthsCopyPreviousCreateUrl;
const v1FinanceBudgetMonthsCopyPreviousCreate = async (id, budgetMonth, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsCopyPreviousCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetMonth)
    });
};
exports.v1FinanceBudgetMonthsCopyPreviousCreate = v1FinanceBudgetMonthsCopyPreviousCreate;
;
const getV1FinanceBudgetMonthsSnapshotRetrieveUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/snapshot/`;
};
exports.getV1FinanceBudgetMonthsSnapshotRetrieveUrl = getV1FinanceBudgetMonthsSnapshotRetrieveUrl;
const v1FinanceBudgetMonthsSnapshotRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsSnapshotRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceBudgetMonthsSnapshotRetrieve = v1FinanceBudgetMonthsSnapshotRetrieve;
;
const getV1FinanceBudgetMonthsThreeMonthAverageCreateUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/three-month-average/`;
};
exports.getV1FinanceBudgetMonthsThreeMonthAverageCreateUrl = getV1FinanceBudgetMonthsThreeMonthAverageCreateUrl;
const v1FinanceBudgetMonthsThreeMonthAverageCreate = async (id, budgetMonth, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsThreeMonthAverageCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetMonth)
    });
};
exports.v1FinanceBudgetMonthsThreeMonthAverageCreate = v1FinanceBudgetMonthsThreeMonthAverageCreate;
;
const getV1FinanceBudgetMonthsZeroOutCreateUrl = (id) => {
    return `/api/v1/finance/budget-months/${id}/zero-out/`;
};
exports.getV1FinanceBudgetMonthsZeroOutCreateUrl = getV1FinanceBudgetMonthsZeroOutCreateUrl;
const v1FinanceBudgetMonthsZeroOutCreate = async (id, budgetMonth, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceBudgetMonthsZeroOutCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(budgetMonth)
    });
};
exports.v1FinanceBudgetMonthsZeroOutCreate = v1FinanceBudgetMonthsZeroOutCreate;
;
const getV1FinanceCategoriesListUrl = () => {
    return `/api/v1/finance/categories/`;
};
exports.getV1FinanceCategoriesListUrl = getV1FinanceCategoriesListUrl;
const v1FinanceCategoriesList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoriesListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceCategoriesList = v1FinanceCategoriesList;
;
const getV1FinanceCategoriesCreateUrl = () => {
    return `/api/v1/finance/categories/`;
};
exports.getV1FinanceCategoriesCreateUrl = getV1FinanceCategoriesCreateUrl;
const v1FinanceCategoriesCreate = async (categoryV2, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoriesCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(categoryV2)
    });
};
exports.v1FinanceCategoriesCreate = v1FinanceCategoriesCreate;
;
const getV1FinanceCategoriesRetrieveUrl = (id) => {
    return `/api/v1/finance/categories/${id}/`;
};
exports.getV1FinanceCategoriesRetrieveUrl = getV1FinanceCategoriesRetrieveUrl;
const v1FinanceCategoriesRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoriesRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceCategoriesRetrieve = v1FinanceCategoriesRetrieve;
;
const getV1FinanceCategoriesUpdateUrl = (id) => {
    return `/api/v1/finance/categories/${id}/`;
};
exports.getV1FinanceCategoriesUpdateUrl = getV1FinanceCategoriesUpdateUrl;
const v1FinanceCategoriesUpdate = async (id, categoryV2, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoriesUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(categoryV2)
    });
};
exports.v1FinanceCategoriesUpdate = v1FinanceCategoriesUpdate;
;
const getV1FinanceCategoriesPartialUpdateUrl = (id) => {
    return `/api/v1/finance/categories/${id}/`;
};
exports.getV1FinanceCategoriesPartialUpdateUrl = getV1FinanceCategoriesPartialUpdateUrl;
const v1FinanceCategoriesPartialUpdate = async (id, patchedCategoryV2, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoriesPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedCategoryV2)
    });
};
exports.v1FinanceCategoriesPartialUpdate = v1FinanceCategoriesPartialUpdate;
;
const getV1FinanceCategoriesDestroyUrl = (id) => {
    return `/api/v1/finance/categories/${id}/`;
};
exports.getV1FinanceCategoriesDestroyUrl = getV1FinanceCategoriesDestroyUrl;
const v1FinanceCategoriesDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoriesDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceCategoriesDestroy = v1FinanceCategoriesDestroy;
;
const getV1FinanceCategoryGroupsListUrl = () => {
    return `/api/v1/finance/category-groups/`;
};
exports.getV1FinanceCategoryGroupsListUrl = getV1FinanceCategoryGroupsListUrl;
const v1FinanceCategoryGroupsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoryGroupsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceCategoryGroupsList = v1FinanceCategoryGroupsList;
;
const getV1FinanceCategoryGroupsCreateUrl = () => {
    return `/api/v1/finance/category-groups/`;
};
exports.getV1FinanceCategoryGroupsCreateUrl = getV1FinanceCategoryGroupsCreateUrl;
const v1FinanceCategoryGroupsCreate = async (categoryGroupV2, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoryGroupsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(categoryGroupV2)
    });
};
exports.v1FinanceCategoryGroupsCreate = v1FinanceCategoryGroupsCreate;
;
const getV1FinanceCategoryGroupsRetrieveUrl = (id) => {
    return `/api/v1/finance/category-groups/${id}/`;
};
exports.getV1FinanceCategoryGroupsRetrieveUrl = getV1FinanceCategoryGroupsRetrieveUrl;
const v1FinanceCategoryGroupsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoryGroupsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceCategoryGroupsRetrieve = v1FinanceCategoryGroupsRetrieve;
;
const getV1FinanceCategoryGroupsUpdateUrl = (id) => {
    return `/api/v1/finance/category-groups/${id}/`;
};
exports.getV1FinanceCategoryGroupsUpdateUrl = getV1FinanceCategoryGroupsUpdateUrl;
const v1FinanceCategoryGroupsUpdate = async (id, categoryGroupV2, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoryGroupsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(categoryGroupV2)
    });
};
exports.v1FinanceCategoryGroupsUpdate = v1FinanceCategoryGroupsUpdate;
;
const getV1FinanceCategoryGroupsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/category-groups/${id}/`;
};
exports.getV1FinanceCategoryGroupsPartialUpdateUrl = getV1FinanceCategoryGroupsPartialUpdateUrl;
const v1FinanceCategoryGroupsPartialUpdate = async (id, patchedCategoryGroupV2, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoryGroupsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedCategoryGroupV2)
    });
};
exports.v1FinanceCategoryGroupsPartialUpdate = v1FinanceCategoryGroupsPartialUpdate;
;
const getV1FinanceCategoryGroupsDestroyUrl = (id) => {
    return `/api/v1/finance/category-groups/${id}/`;
};
exports.getV1FinanceCategoryGroupsDestroyUrl = getV1FinanceCategoryGroupsDestroyUrl;
const v1FinanceCategoryGroupsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceCategoryGroupsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceCategoryGroupsDestroy = v1FinanceCategoryGroupsDestroy;
;
const getV1FinanceEnvelopeAssignmentsListUrl = () => {
    return `/api/v1/finance/envelope-assignments/`;
};
exports.getV1FinanceEnvelopeAssignmentsListUrl = getV1FinanceEnvelopeAssignmentsListUrl;
const v1FinanceEnvelopeAssignmentsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceEnvelopeAssignmentsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceEnvelopeAssignmentsList = v1FinanceEnvelopeAssignmentsList;
;
const getV1FinanceEnvelopeAssignmentsCreateUrl = () => {
    return `/api/v1/finance/envelope-assignments/`;
};
exports.getV1FinanceEnvelopeAssignmentsCreateUrl = getV1FinanceEnvelopeAssignmentsCreateUrl;
const v1FinanceEnvelopeAssignmentsCreate = async (envelopeAssignment, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceEnvelopeAssignmentsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(envelopeAssignment)
    });
};
exports.v1FinanceEnvelopeAssignmentsCreate = v1FinanceEnvelopeAssignmentsCreate;
;
const getV1FinanceEnvelopeAssignmentsRetrieveUrl = (id) => {
    return `/api/v1/finance/envelope-assignments/${id}/`;
};
exports.getV1FinanceEnvelopeAssignmentsRetrieveUrl = getV1FinanceEnvelopeAssignmentsRetrieveUrl;
const v1FinanceEnvelopeAssignmentsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceEnvelopeAssignmentsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceEnvelopeAssignmentsRetrieve = v1FinanceEnvelopeAssignmentsRetrieve;
;
const getV1FinanceEnvelopeAssignmentsUpdateUrl = (id) => {
    return `/api/v1/finance/envelope-assignments/${id}/`;
};
exports.getV1FinanceEnvelopeAssignmentsUpdateUrl = getV1FinanceEnvelopeAssignmentsUpdateUrl;
const v1FinanceEnvelopeAssignmentsUpdate = async (id, envelopeAssignment, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceEnvelopeAssignmentsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(envelopeAssignment)
    });
};
exports.v1FinanceEnvelopeAssignmentsUpdate = v1FinanceEnvelopeAssignmentsUpdate;
;
const getV1FinanceEnvelopeAssignmentsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/envelope-assignments/${id}/`;
};
exports.getV1FinanceEnvelopeAssignmentsPartialUpdateUrl = getV1FinanceEnvelopeAssignmentsPartialUpdateUrl;
const v1FinanceEnvelopeAssignmentsPartialUpdate = async (id, patchedEnvelopeAssignment, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceEnvelopeAssignmentsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedEnvelopeAssignment)
    });
};
exports.v1FinanceEnvelopeAssignmentsPartialUpdate = v1FinanceEnvelopeAssignmentsPartialUpdate;
;
const getV1FinanceEnvelopeAssignmentsDestroyUrl = (id) => {
    return `/api/v1/finance/envelope-assignments/${id}/`;
};
exports.getV1FinanceEnvelopeAssignmentsDestroyUrl = getV1FinanceEnvelopeAssignmentsDestroyUrl;
const v1FinanceEnvelopeAssignmentsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceEnvelopeAssignmentsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceEnvelopeAssignmentsDestroy = v1FinanceEnvelopeAssignmentsDestroy;
;
const getV1FinanceExportsListUrl = () => {
    return `/api/v1/finance/exports/`;
};
exports.getV1FinanceExportsListUrl = getV1FinanceExportsListUrl;
const v1FinanceExportsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceExportsList = v1FinanceExportsList;
;
const getV1FinanceExportsCreateUrl = () => {
    return `/api/v1/finance/exports/`;
};
exports.getV1FinanceExportsCreateUrl = getV1FinanceExportsCreateUrl;
const v1FinanceExportsCreate = async (exportJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(exportJob)
    });
};
exports.v1FinanceExportsCreate = v1FinanceExportsCreate;
;
const getV1FinanceExportsRetrieveUrl = (id) => {
    return `/api/v1/finance/exports/${id}/`;
};
exports.getV1FinanceExportsRetrieveUrl = getV1FinanceExportsRetrieveUrl;
const v1FinanceExportsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceExportsRetrieve = v1FinanceExportsRetrieve;
;
const getV1FinanceExportsUpdateUrl = (id) => {
    return `/api/v1/finance/exports/${id}/`;
};
exports.getV1FinanceExportsUpdateUrl = getV1FinanceExportsUpdateUrl;
const v1FinanceExportsUpdate = async (id, exportJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(exportJob)
    });
};
exports.v1FinanceExportsUpdate = v1FinanceExportsUpdate;
;
const getV1FinanceExportsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/exports/${id}/`;
};
exports.getV1FinanceExportsPartialUpdateUrl = getV1FinanceExportsPartialUpdateUrl;
const v1FinanceExportsPartialUpdate = async (id, patchedExportJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedExportJob)
    });
};
exports.v1FinanceExportsPartialUpdate = v1FinanceExportsPartialUpdate;
;
const getV1FinanceExportsDestroyUrl = (id) => {
    return `/api/v1/finance/exports/${id}/`;
};
exports.getV1FinanceExportsDestroyUrl = getV1FinanceExportsDestroyUrl;
const v1FinanceExportsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceExportsDestroy = v1FinanceExportsDestroy;
;
const getV1FinanceExportsDownloadRetrieveUrl = (id) => {
    return `/api/v1/finance/exports/${id}/download/`;
};
exports.getV1FinanceExportsDownloadRetrieveUrl = getV1FinanceExportsDownloadRetrieveUrl;
const v1FinanceExportsDownloadRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceExportsDownloadRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceExportsDownloadRetrieve = v1FinanceExportsDownloadRetrieve;
;
const getV1FinanceImportsListUrl = () => {
    return `/api/v1/finance/imports/`;
};
exports.getV1FinanceImportsListUrl = getV1FinanceImportsListUrl;
const v1FinanceImportsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceImportsList = v1FinanceImportsList;
;
const getV1FinanceImportsCreateUrl = () => {
    return `/api/v1/finance/imports/`;
};
exports.getV1FinanceImportsCreateUrl = getV1FinanceImportsCreateUrl;
const v1FinanceImportsCreate = async (importJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(importJob)
    });
};
exports.v1FinanceImportsCreate = v1FinanceImportsCreate;
;
const getV1FinanceImportsRetrieveUrl = (id) => {
    return `/api/v1/finance/imports/${id}/`;
};
exports.getV1FinanceImportsRetrieveUrl = getV1FinanceImportsRetrieveUrl;
const v1FinanceImportsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceImportsRetrieve = v1FinanceImportsRetrieve;
;
const getV1FinanceImportsUpdateUrl = (id) => {
    return `/api/v1/finance/imports/${id}/`;
};
exports.getV1FinanceImportsUpdateUrl = getV1FinanceImportsUpdateUrl;
const v1FinanceImportsUpdate = async (id, importJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(importJob)
    });
};
exports.v1FinanceImportsUpdate = v1FinanceImportsUpdate;
;
const getV1FinanceImportsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/imports/${id}/`;
};
exports.getV1FinanceImportsPartialUpdateUrl = getV1FinanceImportsPartialUpdateUrl;
const v1FinanceImportsPartialUpdate = async (id, patchedImportJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedImportJob)
    });
};
exports.v1FinanceImportsPartialUpdate = v1FinanceImportsPartialUpdate;
;
const getV1FinanceImportsDestroyUrl = (id) => {
    return `/api/v1/finance/imports/${id}/`;
};
exports.getV1FinanceImportsDestroyUrl = getV1FinanceImportsDestroyUrl;
const v1FinanceImportsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceImportsDestroy = v1FinanceImportsDestroy;
;
const getV1FinanceImportsExecuteCreateUrl = (id) => {
    return `/api/v1/finance/imports/${id}/execute/`;
};
exports.getV1FinanceImportsExecuteCreateUrl = getV1FinanceImportsExecuteCreateUrl;
const v1FinanceImportsExecuteCreate = async (id, importJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsExecuteCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(importJob)
    });
};
exports.v1FinanceImportsExecuteCreate = v1FinanceImportsExecuteCreate;
;
const getV1FinanceImportsPreviewCreateUrl = (id) => {
    return `/api/v1/finance/imports/${id}/preview/`;
};
exports.getV1FinanceImportsPreviewCreateUrl = getV1FinanceImportsPreviewCreateUrl;
const v1FinanceImportsPreviewCreate = async (id, importJob, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceImportsPreviewCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(importJob)
    });
};
exports.v1FinanceImportsPreviewCreate = v1FinanceImportsPreviewCreate;
;
const getV1FinancePayeesListUrl = () => {
    return `/api/v1/finance/payees/`;
};
exports.getV1FinancePayeesListUrl = getV1FinancePayeesListUrl;
const v1FinancePayeesList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePayeesListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinancePayeesList = v1FinancePayeesList;
;
const getV1FinancePayeesCreateUrl = () => {
    return `/api/v1/finance/payees/`;
};
exports.getV1FinancePayeesCreateUrl = getV1FinancePayeesCreateUrl;
const v1FinancePayeesCreate = async (payee, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePayeesCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(payee)
    });
};
exports.v1FinancePayeesCreate = v1FinancePayeesCreate;
;
const getV1FinancePayeesRetrieveUrl = (id) => {
    return `/api/v1/finance/payees/${id}/`;
};
exports.getV1FinancePayeesRetrieveUrl = getV1FinancePayeesRetrieveUrl;
const v1FinancePayeesRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePayeesRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinancePayeesRetrieve = v1FinancePayeesRetrieve;
;
const getV1FinancePayeesUpdateUrl = (id) => {
    return `/api/v1/finance/payees/${id}/`;
};
exports.getV1FinancePayeesUpdateUrl = getV1FinancePayeesUpdateUrl;
const v1FinancePayeesUpdate = async (id, payee, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePayeesUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(payee)
    });
};
exports.v1FinancePayeesUpdate = v1FinancePayeesUpdate;
;
const getV1FinancePayeesPartialUpdateUrl = (id) => {
    return `/api/v1/finance/payees/${id}/`;
};
exports.getV1FinancePayeesPartialUpdateUrl = getV1FinancePayeesPartialUpdateUrl;
const v1FinancePayeesPartialUpdate = async (id, patchedPayee, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePayeesPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedPayee)
    });
};
exports.v1FinancePayeesPartialUpdate = v1FinancePayeesPartialUpdate;
;
const getV1FinancePayeesDestroyUrl = (id) => {
    return `/api/v1/finance/payees/${id}/`;
};
exports.getV1FinancePayeesDestroyUrl = getV1FinancePayeesDestroyUrl;
const v1FinancePayeesDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePayeesDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinancePayeesDestroy = v1FinancePayeesDestroy;
;
const getV1FinancePostingsListUrl = () => {
    return `/api/v1/finance/postings/`;
};
exports.getV1FinancePostingsListUrl = getV1FinancePostingsListUrl;
const v1FinancePostingsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePostingsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinancePostingsList = v1FinancePostingsList;
;
const getV1FinancePostingsRetrieveUrl = (id) => {
    return `/api/v1/finance/postings/${id}/`;
};
exports.getV1FinancePostingsRetrieveUrl = getV1FinancePostingsRetrieveUrl;
const v1FinancePostingsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinancePostingsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinancePostingsRetrieve = v1FinancePostingsRetrieve;
;
const getV1FinanceReportsListUrl = () => {
    return `/api/v1/finance/reports/`;
};
exports.getV1FinanceReportsListUrl = getV1FinanceReportsListUrl;
const v1FinanceReportsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceReportsList = v1FinanceReportsList;
;
const getV1FinanceReportsCreateUrl = () => {
    return `/api/v1/finance/reports/`;
};
exports.getV1FinanceReportsCreateUrl = getV1FinanceReportsCreateUrl;
const v1FinanceReportsCreate = async (savedReport, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(savedReport)
    });
};
exports.v1FinanceReportsCreate = v1FinanceReportsCreate;
;
const getV1FinanceReportsRetrieveUrl = (id) => {
    return `/api/v1/finance/reports/${id}/`;
};
exports.getV1FinanceReportsRetrieveUrl = getV1FinanceReportsRetrieveUrl;
const v1FinanceReportsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceReportsRetrieve = v1FinanceReportsRetrieve;
;
const getV1FinanceReportsUpdateUrl = (id) => {
    return `/api/v1/finance/reports/${id}/`;
};
exports.getV1FinanceReportsUpdateUrl = getV1FinanceReportsUpdateUrl;
const v1FinanceReportsUpdate = async (id, savedReport, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(savedReport)
    });
};
exports.v1FinanceReportsUpdate = v1FinanceReportsUpdate;
;
const getV1FinanceReportsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/reports/${id}/`;
};
exports.getV1FinanceReportsPartialUpdateUrl = getV1FinanceReportsPartialUpdateUrl;
const v1FinanceReportsPartialUpdate = async (id, patchedSavedReport, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedSavedReport)
    });
};
exports.v1FinanceReportsPartialUpdate = v1FinanceReportsPartialUpdate;
;
const getV1FinanceReportsDestroyUrl = (id) => {
    return `/api/v1/finance/reports/${id}/`;
};
exports.getV1FinanceReportsDestroyUrl = getV1FinanceReportsDestroyUrl;
const v1FinanceReportsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceReportsDestroy = v1FinanceReportsDestroy;
;
const getV1FinanceReportsRunCreate2Url = (id) => {
    return `/api/v1/finance/reports/${id}/run/`;
};
exports.getV1FinanceReportsRunCreate2Url = getV1FinanceReportsRunCreate2Url;
const v1FinanceReportsRunCreate2 = async (id, savedReport, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsRunCreate2Url)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(savedReport)
    });
};
exports.v1FinanceReportsRunCreate2 = v1FinanceReportsRunCreate2;
;
const getV1FinanceReportsRunCreateUrl = () => {
    return `/api/v1/finance/reports/run/`;
};
exports.getV1FinanceReportsRunCreateUrl = getV1FinanceReportsRunCreateUrl;
const v1FinanceReportsRunCreate = async (savedReport, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceReportsRunCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(savedReport)
    });
};
exports.v1FinanceReportsRunCreate = v1FinanceReportsRunCreate;
;
const getV1FinanceRulesListUrl = () => {
    return `/api/v1/finance/rules/`;
};
exports.getV1FinanceRulesListUrl = getV1FinanceRulesListUrl;
const v1FinanceRulesList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceRulesList = v1FinanceRulesList;
;
const getV1FinanceRulesCreateUrl = () => {
    return `/api/v1/finance/rules/`;
};
exports.getV1FinanceRulesCreateUrl = getV1FinanceRulesCreateUrl;
const v1FinanceRulesCreate = async (transactionRule, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(transactionRule)
    });
};
exports.v1FinanceRulesCreate = v1FinanceRulesCreate;
;
const getV1FinanceRulesRetrieveUrl = (id) => {
    return `/api/v1/finance/rules/${id}/`;
};
exports.getV1FinanceRulesRetrieveUrl = getV1FinanceRulesRetrieveUrl;
const v1FinanceRulesRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceRulesRetrieve = v1FinanceRulesRetrieve;
;
const getV1FinanceRulesUpdateUrl = (id) => {
    return `/api/v1/finance/rules/${id}/`;
};
exports.getV1FinanceRulesUpdateUrl = getV1FinanceRulesUpdateUrl;
const v1FinanceRulesUpdate = async (id, transactionRule, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(transactionRule)
    });
};
exports.v1FinanceRulesUpdate = v1FinanceRulesUpdate;
;
const getV1FinanceRulesPartialUpdateUrl = (id) => {
    return `/api/v1/finance/rules/${id}/`;
};
exports.getV1FinanceRulesPartialUpdateUrl = getV1FinanceRulesPartialUpdateUrl;
const v1FinanceRulesPartialUpdate = async (id, patchedTransactionRule, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedTransactionRule)
    });
};
exports.v1FinanceRulesPartialUpdate = v1FinanceRulesPartialUpdate;
;
const getV1FinanceRulesDestroyUrl = (id) => {
    return `/api/v1/finance/rules/${id}/`;
};
exports.getV1FinanceRulesDestroyUrl = getV1FinanceRulesDestroyUrl;
const v1FinanceRulesDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceRulesDestroy = v1FinanceRulesDestroy;
;
const getV1FinanceRulesApplyCreateUrl = () => {
    return `/api/v1/finance/rules/apply/`;
};
exports.getV1FinanceRulesApplyCreateUrl = getV1FinanceRulesApplyCreateUrl;
const v1FinanceRulesApplyCreate = async (transactionRule, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceRulesApplyCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(transactionRule)
    });
};
exports.v1FinanceRulesApplyCreate = v1FinanceRulesApplyCreate;
;
const getV1FinanceScheduledTransactionsListUrl = () => {
    return `/api/v1/finance/scheduled-transactions/`;
};
exports.getV1FinanceScheduledTransactionsListUrl = getV1FinanceScheduledTransactionsListUrl;
const v1FinanceScheduledTransactionsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceScheduledTransactionsList = v1FinanceScheduledTransactionsList;
;
const getV1FinanceScheduledTransactionsCreateUrl = () => {
    return `/api/v1/finance/scheduled-transactions/`;
};
exports.getV1FinanceScheduledTransactionsCreateUrl = getV1FinanceScheduledTransactionsCreateUrl;
const v1FinanceScheduledTransactionsCreate = async (scheduledTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(scheduledTransaction)
    });
};
exports.v1FinanceScheduledTransactionsCreate = v1FinanceScheduledTransactionsCreate;
;
const getV1FinanceScheduledTransactionsRetrieveUrl = (id) => {
    return `/api/v1/finance/scheduled-transactions/${id}/`;
};
exports.getV1FinanceScheduledTransactionsRetrieveUrl = getV1FinanceScheduledTransactionsRetrieveUrl;
const v1FinanceScheduledTransactionsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceScheduledTransactionsRetrieve = v1FinanceScheduledTransactionsRetrieve;
;
const getV1FinanceScheduledTransactionsUpdateUrl = (id) => {
    return `/api/v1/finance/scheduled-transactions/${id}/`;
};
exports.getV1FinanceScheduledTransactionsUpdateUrl = getV1FinanceScheduledTransactionsUpdateUrl;
const v1FinanceScheduledTransactionsUpdate = async (id, scheduledTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(scheduledTransaction)
    });
};
exports.v1FinanceScheduledTransactionsUpdate = v1FinanceScheduledTransactionsUpdate;
;
const getV1FinanceScheduledTransactionsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/scheduled-transactions/${id}/`;
};
exports.getV1FinanceScheduledTransactionsPartialUpdateUrl = getV1FinanceScheduledTransactionsPartialUpdateUrl;
const v1FinanceScheduledTransactionsPartialUpdate = async (id, patchedScheduledTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedScheduledTransaction)
    });
};
exports.v1FinanceScheduledTransactionsPartialUpdate = v1FinanceScheduledTransactionsPartialUpdate;
;
const getV1FinanceScheduledTransactionsDestroyUrl = (id) => {
    return `/api/v1/finance/scheduled-transactions/${id}/`;
};
exports.getV1FinanceScheduledTransactionsDestroyUrl = getV1FinanceScheduledTransactionsDestroyUrl;
const v1FinanceScheduledTransactionsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceScheduledTransactionsDestroy = v1FinanceScheduledTransactionsDestroy;
;
const getV1FinanceScheduledTransactionsRunDueCreateUrl = () => {
    return `/api/v1/finance/scheduled-transactions/run-due/`;
};
exports.getV1FinanceScheduledTransactionsRunDueCreateUrl = getV1FinanceScheduledTransactionsRunDueCreateUrl;
const v1FinanceScheduledTransactionsRunDueCreate = async (scheduledTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceScheduledTransactionsRunDueCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(scheduledTransaction)
    });
};
exports.v1FinanceScheduledTransactionsRunDueCreate = v1FinanceScheduledTransactionsRunDueCreate;
;
const getV1FinanceTagsListUrl = () => {
    return `/api/v1/finance/tags/`;
};
exports.getV1FinanceTagsListUrl = getV1FinanceTagsListUrl;
const v1FinanceTagsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTagsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceTagsList = v1FinanceTagsList;
;
const getV1FinanceTagsCreateUrl = () => {
    return `/api/v1/finance/tags/`;
};
exports.getV1FinanceTagsCreateUrl = getV1FinanceTagsCreateUrl;
const v1FinanceTagsCreate = async (tag, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTagsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(tag)
    });
};
exports.v1FinanceTagsCreate = v1FinanceTagsCreate;
;
const getV1FinanceTagsRetrieveUrl = (id) => {
    return `/api/v1/finance/tags/${id}/`;
};
exports.getV1FinanceTagsRetrieveUrl = getV1FinanceTagsRetrieveUrl;
const v1FinanceTagsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTagsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceTagsRetrieve = v1FinanceTagsRetrieve;
;
const getV1FinanceTagsUpdateUrl = (id) => {
    return `/api/v1/finance/tags/${id}/`;
};
exports.getV1FinanceTagsUpdateUrl = getV1FinanceTagsUpdateUrl;
const v1FinanceTagsUpdate = async (id, tag, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTagsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(tag)
    });
};
exports.v1FinanceTagsUpdate = v1FinanceTagsUpdate;
;
const getV1FinanceTagsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/tags/${id}/`;
};
exports.getV1FinanceTagsPartialUpdateUrl = getV1FinanceTagsPartialUpdateUrl;
const v1FinanceTagsPartialUpdate = async (id, patchedTag, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTagsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedTag)
    });
};
exports.v1FinanceTagsPartialUpdate = v1FinanceTagsPartialUpdate;
;
const getV1FinanceTagsDestroyUrl = (id) => {
    return `/api/v1/finance/tags/${id}/`;
};
exports.getV1FinanceTagsDestroyUrl = getV1FinanceTagsDestroyUrl;
const v1FinanceTagsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTagsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceTagsDestroy = v1FinanceTagsDestroy;
;
const getV1FinanceTransactionsListUrl = (params) => {
    const normalizedParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined) {
            normalizedParams.append(key, value === null ? 'null' : value.toString());
        }
    });
    const stringifiedParams = normalizedParams.toString();
    return stringifiedParams.length > 0 ? `/api/v1/finance/transactions/?${stringifiedParams}` : `/api/v1/finance/transactions/`;
};
exports.getV1FinanceTransactionsListUrl = getV1FinanceTransactionsListUrl;
const v1FinanceTransactionsList = async (params, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsListUrl)(params), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceTransactionsList = v1FinanceTransactionsList;
;
const getV1FinanceTransactionsCreateUrl = () => {
    return `/api/v1/finance/transactions/`;
};
exports.getV1FinanceTransactionsCreateUrl = getV1FinanceTransactionsCreateUrl;
const v1FinanceTransactionsCreate = async (ledgerTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(ledgerTransaction)
    });
};
exports.v1FinanceTransactionsCreate = v1FinanceTransactionsCreate;
;
const getV1FinanceTransactionsRetrieveUrl = (id) => {
    return `/api/v1/finance/transactions/${id}/`;
};
exports.getV1FinanceTransactionsRetrieveUrl = getV1FinanceTransactionsRetrieveUrl;
const v1FinanceTransactionsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1FinanceTransactionsRetrieve = v1FinanceTransactionsRetrieve;
;
const getV1FinanceTransactionsUpdateUrl = (id) => {
    return `/api/v1/finance/transactions/${id}/`;
};
exports.getV1FinanceTransactionsUpdateUrl = getV1FinanceTransactionsUpdateUrl;
const v1FinanceTransactionsUpdate = async (id, ledgerTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(ledgerTransaction)
    });
};
exports.v1FinanceTransactionsUpdate = v1FinanceTransactionsUpdate;
;
const getV1FinanceTransactionsPartialUpdateUrl = (id) => {
    return `/api/v1/finance/transactions/${id}/`;
};
exports.getV1FinanceTransactionsPartialUpdateUrl = getV1FinanceTransactionsPartialUpdateUrl;
const v1FinanceTransactionsPartialUpdate = async (id, patchedLedgerTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedLedgerTransaction)
    });
};
exports.v1FinanceTransactionsPartialUpdate = v1FinanceTransactionsPartialUpdate;
;
const getV1FinanceTransactionsDestroyUrl = (id) => {
    return `/api/v1/finance/transactions/${id}/`;
};
exports.getV1FinanceTransactionsDestroyUrl = getV1FinanceTransactionsDestroyUrl;
const v1FinanceTransactionsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1FinanceTransactionsDestroy = v1FinanceTransactionsDestroy;
;
const getV1FinanceTransactionsApplyRulesCreateUrl = (id) => {
    return `/api/v1/finance/transactions/${id}/apply-rules/`;
};
exports.getV1FinanceTransactionsApplyRulesCreateUrl = getV1FinanceTransactionsApplyRulesCreateUrl;
const v1FinanceTransactionsApplyRulesCreate = async (id, ledgerTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsApplyRulesCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(ledgerTransaction)
    });
};
exports.v1FinanceTransactionsApplyRulesCreate = v1FinanceTransactionsApplyRulesCreate;
;
const getV1FinanceTransactionsBulkUpdateCreateUrl = () => {
    return `/api/v1/finance/transactions/bulk-update/`;
};
exports.getV1FinanceTransactionsBulkUpdateCreateUrl = getV1FinanceTransactionsBulkUpdateCreateUrl;
const v1FinanceTransactionsBulkUpdateCreate = async (ledgerTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1FinanceTransactionsBulkUpdateCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(ledgerTransaction)
    });
};
exports.v1FinanceTransactionsBulkUpdateCreate = v1FinanceTransactionsBulkUpdateCreate;
;
const getV1MeRetrieveUrl = () => {
    return `/api/v1/me/`;
};
exports.getV1MeRetrieveUrl = getV1MeRetrieveUrl;
const v1MeRetrieve = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1MeRetrieveUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1MeRetrieve = v1MeRetrieve;
;
const getV1OrgsListUrl = () => {
    return `/api/v1/orgs/`;
};
exports.getV1OrgsListUrl = getV1OrgsListUrl;
const v1OrgsList = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsListUrl)(), {
        ...options,
        method: 'GET'
    });
};
exports.v1OrgsList = v1OrgsList;
;
const getV1OrgsCreateUrl = () => {
    return `/api/v1/orgs/`;
};
exports.getV1OrgsCreateUrl = getV1OrgsCreateUrl;
const v1OrgsCreate = async (organization, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(organization)
    });
};
exports.v1OrgsCreate = v1OrgsCreate;
;
const getV1OrgsRetrieveUrl = (id) => {
    return `/api/v1/orgs/${id}/`;
};
exports.getV1OrgsRetrieveUrl = getV1OrgsRetrieveUrl;
const v1OrgsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1OrgsRetrieve = v1OrgsRetrieve;
;
const getV1OrgsUpdateUrl = (id) => {
    return `/api/v1/orgs/${id}/`;
};
exports.getV1OrgsUpdateUrl = getV1OrgsUpdateUrl;
const v1OrgsUpdate = async (id, organization, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(organization)
    });
};
exports.v1OrgsUpdate = v1OrgsUpdate;
;
const getV1OrgsPartialUpdateUrl = (id) => {
    return `/api/v1/orgs/${id}/`;
};
exports.getV1OrgsPartialUpdateUrl = getV1OrgsPartialUpdateUrl;
const v1OrgsPartialUpdate = async (id, patchedOrganization, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedOrganization)
    });
};
exports.v1OrgsPartialUpdate = v1OrgsPartialUpdate;
;
const getV1OrgsDestroyUrl = (id) => {
    return `/api/v1/orgs/${id}/`;
};
exports.getV1OrgsDestroyUrl = getV1OrgsDestroyUrl;
const v1OrgsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1OrgsDestroy = v1OrgsDestroy;
;
const getV1OrgsInvitationsRetrieveUrl = (id) => {
    return `/api/v1/orgs/${id}/invitations/`;
};
exports.getV1OrgsInvitationsRetrieveUrl = getV1OrgsInvitationsRetrieveUrl;
const v1OrgsInvitationsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsInvitationsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1OrgsInvitationsRetrieve = v1OrgsInvitationsRetrieve;
;
const getV1OrgsInvitationsCreateUrl = (id) => {
    return `/api/v1/orgs/${id}/invitations/`;
};
exports.getV1OrgsInvitationsCreateUrl = getV1OrgsInvitationsCreateUrl;
const v1OrgsInvitationsCreate = async (id, organization, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsInvitationsCreateUrl)(id), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(organization)
    });
};
exports.v1OrgsInvitationsCreate = v1OrgsInvitationsCreate;
;
const getV1OrgsMembersRetrieveUrl = (id) => {
    return `/api/v1/orgs/${id}/members/`;
};
exports.getV1OrgsMembersRetrieveUrl = getV1OrgsMembersRetrieveUrl;
const v1OrgsMembersRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsMembersRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1OrgsMembersRetrieve = v1OrgsMembersRetrieve;
;
const getV1OrgsMembersPartialUpdateUrl = (id, membershipId) => {
    return `/api/v1/orgs/${id}/members/${membershipId}/`;
};
exports.getV1OrgsMembersPartialUpdateUrl = getV1OrgsMembersPartialUpdateUrl;
const v1OrgsMembersPartialUpdate = async (id, membershipId, patchedOrganization, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsMembersPartialUpdateUrl)(id, membershipId), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedOrganization)
    });
};
exports.v1OrgsMembersPartialUpdate = v1OrgsMembersPartialUpdate;
;
const getV1OrgsMembersRemoveDestroyUrl = (id, membershipId) => {
    return `/api/v1/orgs/${id}/members/${membershipId}/remove/`;
};
exports.getV1OrgsMembersRemoveDestroyUrl = getV1OrgsMembersRemoveDestroyUrl;
const v1OrgsMembersRemoveDestroy = async (id, membershipId, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsMembersRemoveDestroyUrl)(id, membershipId), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1OrgsMembersRemoveDestroy = v1OrgsMembersRemoveDestroy;
;
const getV1OrgsAcceptInvitationCreateUrl = () => {
    return `/api/v1/orgs/accept-invitation/`;
};
exports.getV1OrgsAcceptInvitationCreateUrl = getV1OrgsAcceptInvitationCreateUrl;
const v1OrgsAcceptInvitationCreate = async (organization, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1OrgsAcceptInvitationCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(organization)
    });
};
exports.v1OrgsAcceptInvitationCreate = v1OrgsAcceptInvitationCreate;
;
const getV1ProfileChangePasswordCreateUrl = () => {
    return `/api/v1/profile/change-password/`;
};
exports.getV1ProfileChangePasswordCreateUrl = getV1ProfileChangePasswordCreateUrl;
const v1ProfileChangePasswordCreate = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1ProfileChangePasswordCreateUrl)(), {
        ...options,
        method: 'POST'
    });
};
exports.v1ProfileChangePasswordCreate = v1ProfileChangePasswordCreate;
;
const getV1ProfileDeleteAccountCreateUrl = () => {
    return `/api/v1/profile/delete-account/`;
};
exports.getV1ProfileDeleteAccountCreateUrl = getV1ProfileDeleteAccountCreateUrl;
const v1ProfileDeleteAccountCreate = async (options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1ProfileDeleteAccountCreateUrl)(), {
        ...options,
        method: 'POST'
    });
};
exports.v1ProfileDeleteAccountCreate = v1ProfileDeleteAccountCreate;
;
const getV1ProfileUpdateUpdateUrl = () => {
    return `/api/v1/profile/update/`;
};
exports.getV1ProfileUpdateUpdateUrl = getV1ProfileUpdateUpdateUrl;
const v1ProfileUpdateUpdate = async (userProfile, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1ProfileUpdateUpdateUrl)(), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(userProfile)
    });
};
exports.v1ProfileUpdateUpdate = v1ProfileUpdateUpdate;
;
const getV1ProfileUpdatePartialUpdateUrl = () => {
    return `/api/v1/profile/update/`;
};
exports.getV1ProfileUpdatePartialUpdateUrl = getV1ProfileUpdatePartialUpdateUrl;
const v1ProfileUpdatePartialUpdate = async (patchedUserProfile, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1ProfileUpdatePartialUpdateUrl)(), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedUserProfile)
    });
};
exports.v1ProfileUpdatePartialUpdate = v1ProfileUpdatePartialUpdate;
;
const getV1RegisterCreateUrl = () => {
    return `/api/v1/register/`;
};
exports.getV1RegisterCreateUrl = getV1RegisterCreateUrl;
const v1RegisterCreate = async (userRegistration, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1RegisterCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(userRegistration)
    });
};
exports.v1RegisterCreate = v1RegisterCreate;
;
const getV1TransactionsListUrl = (params) => {
    const normalizedParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined) {
            normalizedParams.append(key, value === null ? 'null' : value.toString());
        }
    });
    const stringifiedParams = normalizedParams.toString();
    return stringifiedParams.length > 0 ? `/api/v1/transactions/?${stringifiedParams}` : `/api/v1/transactions/`;
};
exports.getV1TransactionsListUrl = getV1TransactionsListUrl;
const v1TransactionsList = async (params, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1TransactionsListUrl)(params), {
        ...options,
        method: 'GET'
    });
};
exports.v1TransactionsList = v1TransactionsList;
;
const getV1TransactionsCreateUrl = () => {
    return `/api/v1/transactions/`;
};
exports.getV1TransactionsCreateUrl = getV1TransactionsCreateUrl;
const v1TransactionsCreate = async (transaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1TransactionsCreateUrl)(), {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(transaction)
    });
};
exports.v1TransactionsCreate = v1TransactionsCreate;
;
const getV1TransactionsRetrieveUrl = (id) => {
    return `/api/v1/transactions/${id}/`;
};
exports.getV1TransactionsRetrieveUrl = getV1TransactionsRetrieveUrl;
const v1TransactionsRetrieve = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1TransactionsRetrieveUrl)(id), {
        ...options,
        method: 'GET'
    });
};
exports.v1TransactionsRetrieve = v1TransactionsRetrieve;
;
const getV1TransactionsUpdateUrl = (id) => {
    return `/api/v1/transactions/${id}/`;
};
exports.getV1TransactionsUpdateUrl = getV1TransactionsUpdateUrl;
const v1TransactionsUpdate = async (id, transaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1TransactionsUpdateUrl)(id), {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(transaction)
    });
};
exports.v1TransactionsUpdate = v1TransactionsUpdate;
;
const getV1TransactionsPartialUpdateUrl = (id) => {
    return `/api/v1/transactions/${id}/`;
};
exports.getV1TransactionsPartialUpdateUrl = getV1TransactionsPartialUpdateUrl;
const v1TransactionsPartialUpdate = async (id, patchedTransaction, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1TransactionsPartialUpdateUrl)(id), {
        ...options,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(patchedTransaction)
    });
};
exports.v1TransactionsPartialUpdate = v1TransactionsPartialUpdate;
;
const getV1TransactionsDestroyUrl = (id) => {
    return `/api/v1/transactions/${id}/`;
};
exports.getV1TransactionsDestroyUrl = getV1TransactionsDestroyUrl;
const v1TransactionsDestroy = async (id, options) => {
    return (0, mutator_1.fintrackFetch)((0, exports.getV1TransactionsDestroyUrl)(id), {
        ...options,
        method: 'DELETE'
    });
};
exports.v1TransactionsDestroy = v1TransactionsDestroy;
