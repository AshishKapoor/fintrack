import {
  getV1FinanceCategoriesListKey,
  getV1FinancePayeesListKey,
  v1FinanceCategoriesList,
  v1FinancePayeesList,
} from '@/client/gen/pft/v1/v1'
import type { Category, Payee } from '@/client/gen/pft'
import { useAllPages } from '@/lib/paginated'

/**
 * Whole-list hooks for the two resources every entry form needs in full.
 *
 * The generated `useV1Finance*List` hooks return one page. A category or payee
 * picker filtering client-side over page one silently hides everything past
 * the 50th row, and the user has no way to tell - so these walk `next` instead
 * (see lib/paginated.ts). `data` is the flat array, which is what the call
 * sites already expected back when list endpoints returned bare arrays.
 *
 * The SWR keys are the generated ones, so `mutate()` from a create/update
 * elsewhere still invalidates these.
 */

export const useAllCategories = () =>
  useAllPages<Category>(getV1FinanceCategoriesListKey(), (params) =>
    v1FinanceCategoriesList(params),
  )

export const useAllPayees = () =>
  useAllPages<Payee>(getV1FinancePayeesListKey(), (params) => v1FinancePayeesList(params))
