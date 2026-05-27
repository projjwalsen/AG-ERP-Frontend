"use client";

import * as React from "react";
import {
  ArrowDownLeft, ArrowUpRight, Search, Plus, Eye, CheckCircle, XCircle,
  RefreshCw, DollarSign, CreditCard, Banknote, Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchAllTransactions,
  createTransaction,
  approveTransaction,
  rejectTransaction,
} from "@/app/store/transactionsSlice";
import { transactionApi } from "@/app/services/transaction.service";
import { agencyApi } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { Transaction, TransactionType, PaymentMode, TransactionStatus } from "@/app/types/transaction";
import { Agency } from "@/app/types/agency";
import { Branch } from "@/app/types/branch";
import { formatDate, formatCurrency } from "@/lib/utils";

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700" },
  APPROVED: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const paymentModeIcons: Record<string, React.ReactNode> = {
  CASH: <Banknote className="h-4 w-4" />,
  CHEQUE: <CreditCard className="h-4 w-4" />,
  ONLINE: <Wifi className="h-4 w-4" />,
};

const transactionTypeColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  RECEIVE: { bg: "bg-green-100", text: "text-green-700", icon: <ArrowDownLeft className="h-4 w-4" /> },
  RELEASE: { bg: "bg-blue-100", text: "text-blue-700", icon: <ArrowUpRight className="h-4 w-4" /> },
};

export default function TransactionsPage() {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 mt-1">
          Manage receive and release transactions
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-6 bg-gray-100">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="RECEIVE" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Receive
          </TabsTrigger>
          <TabsTrigger value="RELEASE" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Release
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TransactionsList filterType="" />
        </TabsContent>

        <TabsContent value="RECEIVE">
          <TransactionsList filterType="RECEIVE" />
        </TabsContent>

        <TabsContent value="RELEASE">
          <TransactionsList filterType="RELEASE" />
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
}

// ============== TRANSACTIONS LIST COMPONENT ==============
function TransactionsList({ filterType }: { filterType: string }) {
  const { addToast } = useToast();
  const dispatch = useAppDispatch();
  const { transactions, isLoading, pagination } = useAppSelector((state) => state.transactions);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Form state
  const [showForm, setShowForm] = React.useState(false);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loadingAgencies, setLoadingAgencies] = React.useState(false);
  const [loadingBranches, setLoadingBranches] = React.useState(false);

  // View modal state
  const [viewModal, setViewModal] = React.useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });

  // Approval modal state
  const [approvalModal, setApprovalModal] = React.useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });
  const [remarks, setRemarks] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  // Form data
  const [formData, setFormData] = React.useState({
    type: filterType === "RECEIVE" || filterType === "RELEASE" ? filterType : "RECEIVE" as TransactionType,
    agencyId: "",
    branchId: "",
    amount: "",
    paymentMode: "CASH" as PaymentMode,
    chequeNumber: "",
    bankName: "",
    chequeDate: "",
    transactionId: "",
    remarks: "",
  });

  React.useEffect(() => {
    fetchTransactions();
  }, [currentPage, statusFilter]);

  React.useEffect(() => {
    fetchBranches();
  }, []);

  const fetchTransactions = async (page = currentPage, type?: string, status?: string) => {
    try {
      const params: any = { page, limit: 10 };
      if (type) params.type = type;
      if (status) params.status = status;
      if (searchTerm) params.search = searchTerm;
      await dispatch(fetchAllTransactions(params)).unwrap();
    } catch (err: any) {
      addToast(err || "Failed to fetch transactions", "error");
    }
  };

  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await branchApi.getActive();
      if (response.success && response.data) {
        setBranches(response.data.branches || []);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchAgencies = async () => {
    setLoadingAgencies(true);
    try {
      const response = await agencyApi.getAll({});
      if (response.success && response.data) {
        setAgencies(response.data.agencies || []);
      }
    } catch (err) {
      console.error("Failed to fetch agencies", err);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleOpenForm = async () => {
    setShowForm(true);
    await fetchAgencies();
    setFormData({
      type: filterType === "RECEIVE" || filterType === "RELEASE" ? filterType : "RECEIVE",
      agencyId: "",
      branchId: "",
      amount: "",
      paymentMode: "CASH",
      chequeNumber: "",
      bankName: "",
      chequeDate: "",
      transactionId: "",
      remarks: "",
    });
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agencyId || !formData.amount) {
      addToast("Please fill all required fields", "error");
      return;
    }

    if (formData.paymentMode === "CHEQUE" && (!formData.chequeNumber || !formData.bankName || !formData.chequeDate)) {
      addToast("Please fill all cheque details", "error");
      return;
    }

    if (formData.paymentMode === "ONLINE" && !formData.transactionId) {
      addToast("Please enter transaction ID", "error");
      return;
    }

    setActionLoading(true);
    try {
      await dispatch(
        createTransaction({
          type: formData.type,
          agencyId: formData.agencyId,
          amount: Number(formData.amount),
          paymentMode: formData.paymentMode,
          chequeNumber: formData.paymentMode === "CHEQUE" ? formData.chequeNumber : undefined,
          bankName: formData.paymentMode === "CHEQUE" ? formData.bankName : undefined,
          chequeDate: formData.paymentMode === "CHEQUE" ? formData.chequeDate : undefined,
          transactionId: formData.paymentMode === "ONLINE" ? formData.transactionId : undefined,
          remarks: formData.remarks,
          branchId: formData.branchId || undefined,
        })
      ).unwrap();
      addToast("Transaction created successfully", "success");
      setShowForm(false);
      fetchTransactions();
    } catch (err: any) {
      addToast(err || "Failed to create transaction", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvalModal.transaction) return;
    setActionLoading(true);
    try {
      await dispatch(
        approveTransaction({
          transactionId: approvalModal.transaction.id,
          remarks,
        })
      ).unwrap();
      addToast("Transaction approved successfully", "success");
      setApprovalModal({ open: false, transaction: null });
      setRemarks("");
      fetchTransactions();
    } catch (err: any) {
      addToast(err || "Failed to approve transaction", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.transaction || !rejectionReason) {
      addToast("Please provide rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      await dispatch(
        rejectTransaction({
          transactionId: rejectModal.transaction.id,
          rejectionReason,
        })
      ).unwrap();
      addToast("Transaction rejected", "success");
      setRejectModal({ open: false, transaction: null });
      setRejectionReason("");
      fetchTransactions();
    } catch (err: any) {
      addToast(err || "Failed to reject transaction", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTransactions = React.useMemo(() => {
    let filtered = filterType ? transactions.filter((t) => t.type === filterType) : transactions;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.transactionNumber?.toLowerCase().includes(term) ||
          t.agency?.name?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [transactions, filterType, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {filterType === "RECEIVE" ? "Receive" : filterType === "RELEASE" ? "Release" : "All"} Transactions
          </h2>
          <p className="text-sm text-gray-500">Manage transaction records</p>
        </div>
        <Button onClick={handleOpenForm} className="gap-2">
          <Plus className="h-4 w-4" />
          New Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => fetchTransactions()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredTransactions.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Txn ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{transaction.transactionNumber || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${transactionTypeColors[transaction.type]?.bg} ${transactionTypeColors[transaction.type]?.text}`}>
                          {transactionTypeColors[transaction.type]?.icon}
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${transaction.type === "RECEIVE" ? "bg-green-100" : "bg-blue-100"}`}>
                            <DollarSign className={`h-3.5 w-3.5 ${transaction.type === "RECEIVE" ? "text-green-600" : "text-blue-600"}`} />
                          </div>
                          <span className="text-sm font-medium">{transaction.agency?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          {paymentModeIcons[transaction.paymentMode]}
                          {transaction.paymentMode}
                          {transaction.paymentMode === "CHEQUE" && transaction.chequeNumber && (
                            <span className="text-xs text-gray-400">({transaction.chequeNumber})</span>
                          )}
                          {transaction.paymentMode === "ONLINE" && transaction.transactionId && (
                            <span className="text-xs text-gray-400">({transaction.transactionId})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[transaction.status]?.bg} ${statusColors[transaction.status]?.text}`}>
                          {statusLabels[transaction.status] || transaction.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => setViewModal({ open: true, transaction })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {transaction.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setApprovalModal({ open: true, transaction })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setRejectModal({ open: true, transaction })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transactions found</p>
          </CardContent>
        </Card>
      )}

      {/* Create Transaction Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              New Transaction
            </DialogTitle>
            <DialogDescription>Create a new receive or release transaction.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="txn-type">Transaction Type *</Label>
                <select
                  id="txn-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="RECEIVE">Receive</option>
                  <option value="RELEASE">Release</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="txn-branch">Branch</Label>
                <select
                  id="txn-branch"
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Branch (Optional)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txn-agency">Agency *</Label>
              <select
                id="txn-agency"
                value={formData.agencyId}
                onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Agency</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name} ({agency.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txn-amount">Amount *</Label>
              <Input
                id="txn-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="txn-payment-mode">Payment Mode *</Label>
              <select
                id="txn-payment-mode"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>

            {/* Conditional Cheque Fields */}
            {formData.paymentMode === "CHEQUE" && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Cheque Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cheque-number">Cheque Number *</Label>
                    <Input
                      id="cheque-number"
                      value={formData.chequeNumber}
                      onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                      placeholder="Enter cheque number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name *</Label>
                    <Input
                      id="bank-name"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Enter bank name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cheque-date">Cheque Date *</Label>
                  <Input
                    id="cheque-date"
                    type="date"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Conditional Online Fields */}
            {formData.paymentMode === "ONLINE" && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Online Transaction Details</h4>
                <div className="space-y-2">
                  <Label htmlFor="transaction-id">Transaction ID *</Label>
                  <Input
                    id="transaction-id"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    placeholder="Enter UPI/Transaction ID"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="txn-remarks">Remarks</Label>
              <Textarea
                id="txn-remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={actionLoading}>
                Create Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Transaction Modal */}
      <Dialog open={viewModal.open} onOpenChange={(isOpen) => !isOpen && setViewModal({ open: false, transaction: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          {viewModal.transaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Transaction ID</p>
                  <p className="font-mono font-medium">{viewModal.transaction.transactionNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Type</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${transactionTypeColors[viewModal.transaction.type]?.bg} ${transactionTypeColors[viewModal.transaction.type]?.text}`}>
                    {transactionTypeColors[viewModal.transaction.type]?.icon}
                    {viewModal.transaction.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewModal.transaction.status]?.bg} ${statusColors[viewModal.transaction.status]?.text}`}>
                    {statusLabels[viewModal.transaction.status]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Amount</p>
                  <p className="font-semibold text-lg text-gray-900">
                    {formatCurrency(viewModal.transaction.amount)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Agency</p>
                    <p className="font-medium">{viewModal.transaction.agency?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Payment Mode</p>
                    <div className="flex items-center gap-1.5">
                      {paymentModeIcons[viewModal.transaction.paymentMode]}
                      <span>{viewModal.transaction.paymentMode}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewModal.transaction.paymentMode === "CHEQUE" && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Cheque Details</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Number</p>
                      <p className="font-medium">{viewModal.transaction.chequeNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Bank</p>
                      <p className="font-medium">{viewModal.transaction.bankName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{viewModal.transaction.chequeDate ? formatDate(viewModal.transaction.chequeDate) : "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              {viewModal.transaction.paymentMode === "ONLINE" && viewModal.transaction.transactionId && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-500 uppercase mb-2">Transaction Details</h4>
                  <div>
                    <p className="text-gray-500">Transaction ID</p>
                    <p className="font-mono font-medium">{viewModal.transaction.transactionId}</p>
                  </div>
                </div>
              )}

              {viewModal.transaction.remarks && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Remarks</p>
                  <p className="text-sm text-gray-700">{viewModal.transaction.remarks}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 uppercase">Created At</p>
                <p className="text-sm">{formatDate(viewModal.transaction.createdAt)}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModal({ open: false, transaction: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={approvalModal.open} onOpenChange={(isOpen) => !isOpen && setApprovalModal({ open: false, transaction: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve Transaction
            </DialogTitle>
            <DialogDescription>
              Approve {approvalModal.transaction?.type === "RECEIVE" ? "receive" : "release"} transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-medium">{approvalModal.transaction?.transactionNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Agency:</span>
                <span className="font-medium">{approvalModal.transaction?.agency?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(approvalModal.transaction?.amount || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-remarks">Remarks (Optional)</Label>
              <Textarea
                id="approve-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any remarks..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalModal({ open: false, transaction: null })}>
              Cancel
            </Button>
            <Button onClick={handleApprove} loading={actionLoading} className="bg-green-600 hover:bg-green-700">
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(isOpen) => !isOpen && setRejectModal({ open: false, transaction: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Transaction
            </DialogTitle>
            <DialogDescription>
              Reject {rejectModal.transaction?.type === "RECEIVE" ? "receive" : "release"} transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-medium">{rejectModal.transaction?.transactionNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Agency:</span>
                <span className="font-medium">{rejectModal.transaction?.agency?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(rejectModal.transaction?.amount || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason *</Label>
              <Textarea
                id="reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, transaction: null })}>
              Cancel
            </Button>
            <Button onClick={handleReject} loading={actionLoading} variant="destructive">
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}