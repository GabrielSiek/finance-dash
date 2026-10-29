// The parts of Pluggy's API payloads this server reads.

export interface Page<T> {
  results?: T[];
  totalPages?: number;
}

export interface CursorPage<T> {
  results?: T[];
  next?: string | null;
}

export interface PluggyItem {
  id: string;
  status: string;
  executionStatus?: string | null;
  lastUpdatedAt?: string | null;
  error?: { message?: string } | null;
  connector?: { name?: string; imageUrl?: string; isSandbox?: boolean } | null;
}

export interface PluggyInvestment {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  subtype?: string | null;
  status?: string | null;
  balance?: number | null;
  amountOriginal?: number | null;
  amountProfit?: number | null;
  quantity?: number | null;
  value?: number | null;
  currencyCode?: string | null;
  rate?: number | null;
  rateType?: string | null;
  fixedAnnualRate?: number | null;
  lastMonthRate?: number | null;
  lastTwelveMonthsRate?: number | null;
  issuer?: string | null;
  dueDate?: string | null;
  purchaseDate?: string | null;
  issueDate?: string | null;
  institution?: { name?: string } | null;
}

export interface PluggyInvestmentTx {
  type?: string;
  movementType?: string;
  amount?: number | null;
  netAmount?: number | null;
  value?: number | null;
  quantity?: number | null;
  date?: string | null;
  tradeDate?: string | null;
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  name: string;
  marketingName?: string | null;
  number?: string | null;
  type: 'BANK' | 'CREDIT';
  subtype?: string | null;
  balance?: number | null;
  currencyCode?: string | null;
  creditData?: {
    creditLimit?: number | null;
    availableCreditLimit?: number | null;
    balanceCloseDate?: string | null;
    balanceDueDate?: string | null;
    brand?: string | null;
    level?: string | null;
    minimumPayment?: number | null;
  } | null;
}

export interface PluggyCategory {
  id: string;
  description: string;
  descriptionTranslated?: string | null;
  parentId?: string | null;
  parentDescription?: string | null;
}

interface PluggyParty {
  name?: string | null;
}

export interface PluggyTransaction {
  id: string;
  description?: string | null;
  descriptionRaw?: string | null;
  date?: string | null;
  amount?: number | null;
  amountInAccountCurrency?: number | null;
  type?: 'CREDIT' | 'DEBIT' | null;
  status?: string | null;
  categoryId?: string | null;
  category?: string | null;
  operationType?: string | null;
  paymentData?: { paymentMethod?: string | null; payer?: PluggyParty | null; receiver?: PluggyParty | null } | null;
  merchant?: { name?: string | null; businessName?: string | null } | null;
  creditCardMetadata?: { installmentNumber?: number | null; totalInstallments?: number | null } | null;
}
