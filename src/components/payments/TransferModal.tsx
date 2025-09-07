import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { DollarSign, X, Send, User as UserIcon, CheckCircle2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardBody } from "../ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SearchUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, updateUser } = useAuth(); // ✅ using updateUser instead of setUser
  const [amount, setAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipient, setRecipient] = useState<SearchUser | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  const resetState = () => {
    setAmount("");
    setRecipientEmail("");
    setRecipient(null);
    setSearchResults([]);
    setError("");
    setLoading(false);
    setSuccess(false);
    controllerRef.current = null;
  };

  const handleClose = () => {
    if (loading && controllerRef.current) controllerRef.current.abort();
    resetState();
    onClose();
  };

  // Fetch latest balance when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;
    (async () => {
      try {
        const token = localStorage.getItem("business_nexus_token");
        const res = await fetch(`/api/users/${user.id}/balance`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    })();
  }, [isOpen, user]);

  // Search users by email
  const searchUsers = useCallback(
    async (email: string) => {
      if (!email || email.length < 3) return setSearchResults([]);
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setSearching(true);
      try {
        const token = localStorage.getItem("business_nexus_token");
        const res = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.filter((u: SearchUser) => u.id !== user?.id));
        }
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    const handler = setTimeout(() => searchUsers(recipientEmail), 400);
    return () => clearTimeout(handler);
  }, [recipientEmail, searchUsers]);

  const parseAmountSafe = (s: string) => {
    const n = Number(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  };

  const numericAmount = parseAmountSafe(amount) || 0;
  const transferFee = useMemo(
    () => (numericAmount <= 0 ? 0 : Math.max(1, numericAmount * 0.005)),
    [numericAmount]
  );
  const totalAmount = numericAmount + transferFee;

  const handleIncrease = () => setAmount((numericAmount + 10).toFixed(2));
  const handleDecrease = () => setAmount(Math.max(0, numericAmount - 10).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!recipient) return setError("Please select a recipient");
    if (!numericAmount || numericAmount <= 0) return setError("Please enter a valid amount");
    if (numericAmount < 1) return setError("Minimum transfer amount is $1");
    if (balance !== null && totalAmount > balance) return setError("Insufficient balance");

    setLoading(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const token = localStorage.getItem("business_nexus_token");
      const res = await fetch("/api/transactions/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          amount: numericAmount,
          fee: transferFee,
          description: `Transfer to ${recipient.email}`,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) return setError(data.message || "Transfer failed");

      // ✅ Instantly update balance in both modal state and global auth context
      setBalance((prev) => (prev !== null ? prev - totalAmount : prev));
      if (user) {
        updateUser({ ...user, balance: (user.balance || 0) - totalAmount });
      }

      setSuccess(true);
      onSuccess();

      setTimeout(() => handleClose(), 1800);
    } catch (err: any) {
      setError(err?.name === "AbortError" ? "Transfer cancelled" : "Network error. Please try again.");
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const displayAmount = numericAmount > 0 ? numericAmount.toFixed(2) : "0.00";

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
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg"
            >
              <Send size={22} className="text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900">Transfer Funds</h2>
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
              <CheckCircle2 className="text-blue-500 w-16 h-16 mb-3" />
              <p className="text-lg font-semibold text-gray-800">Transfer Successful!</p>
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

            {/* Balance */}
            {balance !== null && (
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign size={16} className="mr-1 text-gray-500" />
                Current Balance: ${balance.toFixed(2)}
              </div>
            )}

            {/* Recipient */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email</label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setRecipient(null);
                }}
                placeholder="Enter recipient's email"
                disabled={loading}
                required
                className="w-full rounded-xl border border-gray-400 px-4 py-3 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />

              {recipientEmail.length >= 3 && !recipient && (
                <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-xl shadow-lg">
                  {searching ? (
                    <div className="p-2 text-sm text-gray-500">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setRecipient(u);
                          setRecipientEmail(u.email);
                          setSearchResults([]);
                        }}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer"
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon size={16} className="text-gray-600" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No users found</div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Transfer</label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleDecrease}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  -
                </Button>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  disabled={loading}
                  className="text-center text-lg font-medium px-4 py-3 w-40 border border-gray-400 rounded-xl focus:border-blue-600 focus:ring-blue-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                />
                <Button
                  type="button"
                  onClick={handleIncrease}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Min $1</p>
            </div>

            {/* Fee Info */}
            {numericAmount > 0 && (
              <Card className="bg-gray-50">
                <CardBody className="p-4 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Transfer Amount</span>
                    <span>${numericAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Fee (0.5% or min $1)</span>
                    <span>${transferFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-gray-900">
                    <span>Total Deducted</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-2xl border border-blue-400 !bg-white !text-blue-600 hover:!bg-blue-50 hover:!text-blue-700 transition"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !amount || !recipient}
                className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white shadow-lg transition transform active:scale-95"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Send $${displayAmount}`
                )}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </Modal>
  );
};
