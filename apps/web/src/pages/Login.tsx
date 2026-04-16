import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HelpCircle, ChevronRight, Shield, Users, UserCheck, Briefcase } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { getPostLoginPath } from "@/lib/access";

function MarketingPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#2D116C] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,77,255,0.5),transparent_32%)]" />
      <div className="relative ml-auto max-w-[420px] pt-6">
        <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F39BE5]">
          Instant business insights with Inkle AI
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/90">
          It calculates your burn rate, cash flow and more. No more manual
          tracking or number crunching. You get a complete health check of your
          business in one place.
        </p>
      </div>
      <div className="relative mx-auto mb-8 mt-6 h-[320px] w-[90%] rounded-2xl border border-white/15 bg-white/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
        <div className="text-xl font-semibold text-[#1E174A]">
          Business Insights
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-[#ECE7FB] bg-[#FBFAFF] p-4">
            <div className="text-xs font-medium text-[#1E174A]">Cash Flow</div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-[#4E476F]">
              {["Revenue", "Expense", "Profit"].map((label, index) => (
                <div key={label}>
                  <p className="text-[10px] text-[#8C86A6]">{label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {["$240k", "$140k", "$100k"][index]}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-[100px] items-end justify-between gap-2">
              {[56, 42, 58, 44, 50, 70].map((height, index) => (
                <div key={index} className="flex flex-1 items-end gap-0.5">
                  <div
                    className="w-1/2 rounded-t-sm bg-[#B8A7FF]"
                    style={{ height: height * 0.75 }}
                  />
                  <div
                    className="w-1/2 rounded-t-sm bg-[#D6D1E6]"
                    style={{ height: height * 0.54 }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#ECE7FB] bg-white p-4">
            <div className="text-xs font-medium text-[#1E174A]">
              Financial Health
            </div>
            <div className="mt-4 space-y-5 text-[#4E476F]">
              <div>
                <p className="text-[10px] text-[#8C86A6]">Net Burn Rate</p>
                <p className="mt-1 text-2xl font-semibold">-$1.1M</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8C86A6]">Runway</p>
                <p className="mt-1 text-2xl font-semibold">Infinite</p>
                <p className="mt-0.5 text-xs text-[#8C86A6]">
                  You&apos;re profitable!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  { key: 'admin', label: 'Admin', email: 'superadmin@taxos.ai', password: 'admin1234', icon: Shield, color: 'text-[#991B1B]', bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', hover: 'hover:bg-[#FEE2E2]' },
  { key: 'founder', label: 'Founder', email: 'founder@demo.taxos.ai', password: 'password123', icon: Briefcase, color: 'text-[#6C5CE7]', bg: 'bg-[#F5F3FF]', border: 'border-[#DDD6FE]', hover: 'hover:bg-[#EDE9FE]' },
  { key: 'team', label: 'Team Member', email: 'team@demo.taxos.ai', password: 'password123', icon: Users, color: 'text-[#0369A1]', bg: 'bg-[#F0F9FF]', border: 'border-[#BAE6FD]', hover: 'hover:bg-[#E0F2FE]' },
  { key: 'cpa', label: 'CPA', email: 'cpa@demo.taxos.ai', password: 'password123', icon: UserCheck, color: 'text-[#166534]', bg: 'bg-[#F0FDF4]', border: 'border-[#BBF7D0]', hover: 'hover:bg-[#DCFCE7]' },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("login_email") || "superadmin@taxos.ai";
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem("login_password") || "admin1234";
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      localStorage.setItem("login_email", email);
      localStorage.setItem("login_password", password);
      navigate(getPostLoginPath(useAuthStore.getState().user));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (account: typeof DEMO_ACCOUNTS[number]) => {
    setError("");
    setQuickLoading(account.key);
    try {
      await login(account.email, account.password);
      localStorage.setItem("login_email", account.email);
      localStorage.setItem("login_password", account.password);
      navigate(getPostLoginPath(useAuthStore.getState().user));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#FCFBFF] lg:grid-cols-[1.08fr_0.92fr]">
      <div className="flex min-h-screen flex-col px-6 py-6 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-semibold tracking-[-0.03em] text-[#5B2FFF]">
            inkle
          </div>
          <button className="flex items-center gap-1.5 text-sm text-[#6F6A8B]">
            <HelpCircle size={15} /> Help
          </button>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#1E174A]">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-[#6F6A8B]">
              Don&apos;t have an account?{" "}
              <Link
                to="/onboarding/start"
                className="font-medium text-[#5B2FFF]"
              >
                Sign up <ChevronRight className="inline" size={14} />
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8">
              <label className="mb-1.5 block text-sm font-medium text-[#4E4970]">
                Work email address
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="Email address"
                className="h-10 w-full rounded-lg border border-[#DED8EB] bg-white px-3.5 text-sm text-[#312A56] outline-none placeholder:text-[#ABA7BE] focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
              />

              <label className="mb-1.5 mt-4 block text-sm font-medium text-[#4E4970]">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                placeholder="Password"
                className="h-10 w-full rounded-lg border border-[#DED8EB] bg-white px-3.5 text-sm text-[#312A56] outline-none placeholder:text-[#ABA7BE] focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
              />

              {error && <p className="mt-3 text-sm text-[#D94A5B]">{error}</p>}

              <button
                disabled={loading}
                className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-[linear-gradient(90deg,#5A2CFF_0%,#6F32FF_100%)] text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
              <div className="mt-6 rounded-xl border border-[#E4E0F5] bg-[#F8F7FF] p-4">
                <p className="text-sm font-medium text-[#4E4970] mb-3">
                  Quick Login
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    const isLoading = quickLoading === account.key;
                    return (
                      <button
                        key={account.key}
                        type="button"
                        disabled={isLoading || loading}
                        onClick={() => handleQuickLogin(account)}
                        className={`flex items-center gap-2.5 rounded-lg border ${account.border} ${account.bg} ${account.hover} px-3 py-2.5 text-left transition-colors disabled:opacity-50`}
                      >
                        <Icon size={16} className={account.color} />
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${account.color}`}>
                            {isLoading ? 'Signing in...' : `Login as ${account.label}`}
                          </p>
                          <p className="text-[11px] text-[#8B84A8] truncate">{account.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <MarketingPanel />
    </div>
  );
}
