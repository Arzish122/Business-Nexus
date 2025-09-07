import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Send,
  History,
  DollarSign,
  RefreshCcw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DepositModal } from "../../components/payments/DepositModal";
import { WithdrawModal } from "../../components/payments/WithdrawModal";
import { TransferModal } from "../../components/payments/TransferModal";
import { TransactionHistory } from "../../components/payments/TransactionHistory";
import { Button } from "../../components/ui/Button";

interface Transaction {
  _id: string;
  type: "deposit" | "withdraw" | "transfer";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string;
  recipientId?: { _id: string; name: string; email: string };
  userId: { _id: string; name: string; email: string };
  createdAt: string;
  processedAt?: string;
}

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const tokenHeader = (): HeadersInit => {
    const token = localStorage.getItem("business_nexus_token");
    return token ? { "x-auth-token": token } : {};
  };

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      let response = await fetch("/api/users/me", { headers: tokenHeader() });
      if (!response.ok)
        response = await fetch("/api/auth/me", { headers: tokenHeader() });

      if (response.ok) {
        const data = await response.json();
        const apiBalance =
          typeof data?.balance === "number"
            ? data.balance
            : typeof data?.user?.balance === "number"
            ? data.user.balance
            : typeof data?.data?.balance === "number"
            ? data.data.balance
            : null;
        if (typeof apiBalance === "number") setBalance(apiBalance);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const response = await fetch("/api/payments/transactions", {
        headers: tokenHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        if (typeof data.balance === "number") setBalance(data.balance);
      } else setTransactions([]);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  };

  const computedBalance = useMemo(() => {
    if (!user?.id || transactions.length === 0) return null;
    let total = 0;
    for (const tx of transactions) {
      if (tx.status !== "completed") continue;
      const isSender = tx.userId?._id === user.id;
      const isRecipient = tx.recipientId?._id === user.id;
      if (tx.type === "deposit" && isSender) total += tx.amount;
      if (tx.type === "withdraw" && isSender) total -= tx.amount;
      if (tx.type === "transfer") {
        if (isSender) total -= tx.amount;
        if (isRecipient) total += tx.amount;
      }
    }
    return total;
  }, [transactions, user?.id]);

  useEffect(() => {
    if (!loadingBalance && balance === null && computedBalance !== null) {
      setBalance(computedBalance);
    }
  }, [loadingBalance, balance, computedBalance]);

  useEffect(() => {
    (async () => {
      await fetchBalance();
      await fetchTransactions();
    })();
  }, []);

  const handleTransactionSuccess = async () => {
    await fetchBalance();
    await fetchTransactions();
  };

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Payments Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-lg">
            Manage your money with ease & security
          </p>
        </div>
        <Button
          onClick={async () => {
            await fetchBalance();
            await fetchTransactions();
          }}
          leftIcon={<RefreshCcw size={18} className="animate-spin-slow" />}
          variant="outline"
          className="rounded-xl"
        >
          Refresh Data
        </Button>
      </div>

      {/* BALANCE CARD */}
      <div className="rounded-2xl p-8 bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-20 text-blue-200 text-9xl">
          <DollarSign size={180} />
        </div>
        <h3 className="text-xl font-semibold">Available Balance</h3>
        {loadingBalance ? (
          <p className="mt-4 animate-pulse text-3xl">Loading...</p>
        ) : balance === null ? (
          <p className="mt-4 text-3xl">Balance Unavailable</p>
        ) : (
          <p className="mt-4 text-5xl font-extrabold tracking-wide">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        )}
        <p className="text-sm mt-2 opacity-80">USD</p>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button
          onClick={() => setShowDepositModal(true)}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition hover:scale-105"
        >
          <ArrowDownCircle size={36} className="text-green-600" />
          <span className="font-semibold text-gray-700">Deposit</span>
        </button>
        <button
          onClick={() => setShowWithdrawModal(true)}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition hover:scale-105"
        >
          <ArrowUpCircle size={36} className="text-red-600" />
          <span className="font-semibold text-gray-700">Withdraw</span>
        </button>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition hover:scale-105"
        >
          <Send size={36} className="text-blue-600" />
          <span className="font-semibold text-gray-700">Transfer</span>
        </button>
      </div>

      {/* TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              Recent Activity
            </h3>
            <History size={20} className="text-gray-400" />
          </div>
          {loadingTx ? (
            <p className="text-gray-500 animate-pulse">
              Loading transactions...
            </p>
          ) : recentTransactions.length === 0 ? (
            <p className="text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="space-y-6">
              {recentTransactions.map((tx) => (
                <li
                  key={tx._id}
                  className="relative pl-10 border-l border-gray-200"
                >
                  <div className="absolute -left-3 top-0 bg-white border border-gray-300 rounded-full p-2">
                    {tx.type === "deposit" && (
                      <ArrowDownCircle className="text-green-600" size={20} />
                    )}
                    {tx.type === "withdraw" && (
                      <ArrowUpCircle className="text-red-600" size={20} />
                    )}
                    {tx.type === "transfer" && (
                      <Send className="text-blue-600" size={20} />
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-800">
                      {tx.description}
                    </p>
                    <span
                      className={`font-semibold ${
                        tx.type === "deposit"
                          ? "text-green-600"
                          : tx.type === "withdraw"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {tx.type === "withdraw" ? "-" : "+"}${tx.amount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Full History Table */}
        <TransactionHistory
          transactions={transactions}
          loading={loadingTx}
          onRefresh={fetchTransactions}
        />
      </div>

      {/* Modals */}
      {/* Modals */}
<DepositModal
  isOpen={showDepositModal}
  onClose={() => setShowDepositModal(false)}
/>
<WithdrawModal
  isOpen={showWithdrawModal}
  onClose={() => setShowWithdrawModal(false)}
  onSuccess={handleTransactionSuccess}
/>
<TransferModal
  isOpen={showTransferModal}
  onClose={() => setShowTransferModal(false)}
  onSuccess={handleTransactionSuccess}
/>

    </div>
  );
};

export default PaymentsPage;
