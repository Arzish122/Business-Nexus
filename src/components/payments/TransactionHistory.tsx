import React, { useState } from "react";
import {
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Send,
  DollarSign,
  Filter,
  RefreshCw,
  Calendar,
  User,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Select, SelectOption } from "../ui/Select";
import { Input } from "../ui/Input";
import { motion, AnimatePresence } from "framer-motion";

interface Transaction {
  _id: string;
  type: "deposit" | "withdraw" | "transfer";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string;
  recipientId?: {
    _id: string;
    name: string;
    email: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  processedAt?: string;
  paymentMethod?: string;
  errorMessage?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading,
  onRefresh,
}) => {
  const [filter, setFilter] = useState({
    type: "all",
    status: "all",
    dateRange: "30",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "danger";
      case "cancelled":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return (
          <div className="p-2 bg-green-100 rounded-full">
            <ArrowDownCircle size={18} className="text-green-600" />
          </div>
        );
      case "withdraw":
        return (
          <div className="p-2 bg-red-100 rounded-full">
            <ArrowUpCircle size={18} className="text-red-600" />
          </div>
        );
      case "transfer":
        return (
          <div className="p-2 bg-blue-100 rounded-full">
            <Send size={18} className="text-blue-600" />
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-full">
            <DollarSign size={18} className="text-gray-600" />
          </div>
        );
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter.type !== "all" && transaction.type !== filter.type) return false;
    if (filter.status !== "all" && transaction.status !== filter.status)
      return false;

    if (filter.dateRange !== "all") {
      const days = parseInt(filter.dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      if (new Date(transaction.createdAt) < cutoffDate) return false;
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower) ||
        transaction.recipientId?.name.toLowerCase().includes(searchLower) ||
        transaction.recipientId?.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const clearFilters = () => {
    setFilter({ type: "all", status: "all", dateRange: "30" });
    setSearchTerm("");
  };

  return (
    <Card className="bg-white/80 backdrop-blur-xl shadow-xl rounded-3xl border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History size={20} className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Transaction History
            </h3>
            <Badge variant="secondary" size="sm">
              {filteredTransactions.length}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <Select
                  value={filter.type}
                  onChange={(value) =>
                    setFilter((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectOption value="all">All Types</SelectOption>
                  <SelectOption value="deposit">Deposits</SelectOption>
                  <SelectOption value="withdraw">Withdrawals</SelectOption>
                  <SelectOption value="transfer">Transfers</SelectOption>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={filter.status}
                  onChange={(value) =>
                    setFilter((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectOption value="all">All Status</SelectOption>
                  <SelectOption value="completed">Completed</SelectOption>
                  <SelectOption value="pending">Pending</SelectOption>
                  <SelectOption value="failed">Failed</SelectOption>
                  <SelectOption value="cancelled">Cancelled</SelectOption>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <Select
                  value={filter.dateRange}
                  onChange={(value) =>
                    setFilter((prev) => ({ ...prev, dateRange: value }))
                  }
                >
                  <SelectOption value="7">Last 7 days</SelectOption>
                  <SelectOption value="30">Last 30 days</SelectOption>
                  <SelectOption value="90">Last 90 days</SelectOption>
                  <SelectOption value="all">All time</SelectOption>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Search
                </label>
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transactions..."
                  size={1}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardBody>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <History size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400">
              {transactions.length === 0
                ? "Your transaction history will appear here"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(transaction.type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <Badge
                            variant={
                              getStatusColor(transaction.status) as
                                | "success"
                                | "warning"
                                | "secondary"
                            }
                            size="sm"
                          >
                            {transaction.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>
                              {new Date(
                                transaction.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {transaction.recipientId && (
                            <div className="flex items-center space-x-1">
                              <User size={12} />
                              <span>To: {transaction.recipientId.name}</span>
                            </div>
                          )}

                          {transaction.paymentMethod && (
                            <span className="capitalize">
                              via {transaction.paymentMethod}
                            </span>
                          )}
                        </div>

                        {transaction.errorMessage && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {transaction.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          transaction.type === "deposit"
                            ? "text-green-600"
                            : transaction.type === "withdraw"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {transaction.type === "withdraw" ? "-" : "+"}$
                        {transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.currency}
                      </p>
                      {transaction.processedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Processed:{" "}
                          {new Date(
                            transaction.processedAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
