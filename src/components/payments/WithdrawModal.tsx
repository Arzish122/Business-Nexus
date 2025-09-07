import React, { useState, useRef } from "react";
import { DollarSign, X, Plus, Minus, CheckCircle2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL } from "../../config/api";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const resetState = () => {
    setAmount("");
    setMethod("");
    setEmail("");
    setCard("");
    setAccount("");
    setError("");
    setLoading(false);
    setSuccess(false);
    abortRef.current = null;
  };

  const handleClose = () => {
    if (loading && abortRef.current) abortRef.current.abort();
    resetState();
    onClose();
  };

  const handleIncrease = () => {
    const current = parseFloat(amount || "0") || 0;
    setAmount((current + 10).toFixed(2));
  };

  const handleDecrease = () => {
    const current = parseFloat(amount || "0") || 0;
    setAmount(Math.max(0, current - 10).toFixed(2));
  };

  const parseAmountSafe = (s: string) => {
    const n = Number(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amt = parseAmountSafe(amount);
    if (!amt || amt <= 0) return setError("Please enter a valid amount");
    if (amt < 1) return setError("Minimum withdrawal is $1");
    if (amt > 10000) return setError("Maximum withdrawal is $10,000");
    if (!method) return setError("Please select a payment method");

    if (method === "paypal" && !email)
      return setError("PayPal email is required");
    if (method === "credit" && !card)
      return setError("Credit card number is required");
    if (method === "bank" && !account)
      return setError("Bank account number is required");

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem("business_nexus_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const resp = await fetch(`${API_URL}/payments/withdraw`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amt,
          description: `Withdrawal of $${amt}`,
          method,
          email,
          card,
          account,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: text || "" };
        }
        return setError(data?.message || `Withdrawal failed (${resp.status})`);
      }

      setSuccess(true);
      onSuccess?.();

      setTimeout(() => {
        resetState();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(
        err?.name === "AbortError"
          ? "Withdrawal cancelled"
          : "Network error. Please try again."
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const displayAmount = (() => {
    const n = parseAmountSafe(amount);
    return !isNaN(n) && n > 0 ? n.toFixed(2) : "0.00";
  })();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="p-6 rounded-3xl shadow-2xl bg-white/80 backdrop-blur-xl border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg"
            >
              <DollarSign size={22} className="text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900">
              Withdraw Funds
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="hover:bg-gray-200 rounded-full p-2"
          >
            <X size={20} className="text-gray-600" />
          </Button>
        </div>

        {/* Success animation */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <CheckCircle2 className="text-red-500 w-16 h-16 mb-3" />
              <p className="text-lg font-semibold text-gray-800">
                Withdrawal Successful!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-100 border border-red-300 rounded-lg"
              >
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Withdraw Amount
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleDecrease}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <Minus size={16} />
                </Button>

                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  max="10000"
                  step="0.01"
                  disabled={loading}
                  className="text-center text-lg font-medium px-4 py-3 w-40 border border-gray-400 rounded-xl focus:border-red-600 focus:ring-red-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                />

                <Button
                  type="button"
                  onClick={handleIncrease}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Min $1 • Max $10,000
              </p>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={loading}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-red-600 focus:ring-red-600"
              >
                <option value="">Select method</option>
                <option value="paypal">PayPal</option>
                <option value="credit">Credit Card</option>
                <option value="bank">Bank Transfer</option>
              </select>

              {method === "paypal" && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="PayPal Email"
                  disabled={loading}
                  required
                  className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-red-600 focus:ring-red-600"
                />
              )}

              {method === "credit" && (
                <input
                  type="text"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  placeholder="Credit Card Number"
                  disabled={loading}
                  required
                  className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-red-600 focus:ring-red-600"
                />
              )}

              {method === "bank" && (
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="Bank Account Number"
                  disabled={loading}
                  required
                  className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-red-600 focus:ring-red-600"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-2xl border border-red-400 !bg-white !text-red-600 hover:!bg-red-50 hover:!text-red-700 transition"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading || !amount}
                className="flex-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:opacity-90 text-white shadow-lg transition transform active:scale-95"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Withdraw $${displayAmount}`
                )}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </Modal>
  );
};
