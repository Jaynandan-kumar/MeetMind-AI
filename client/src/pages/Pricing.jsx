import React from 'react'
import { PricingTable } from '@clerk/react'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const Pricing = () => {
  return (
    <div className="max-w-6xl mx-auto w-full min-h-[calc(100vh-7rem)] flex flex-col justify-center p-6 md:p-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-xs font-medium gap-1.5 mb-6 text-slate-500 hover:text-slate-900 transition-colors self-start cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Sparkles size={13} />
          <span>Flexible Plans for Everyone</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
          Simple, transparent pricing.
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Get started with our generous Free plan today, and upgrade whenever your team needs more capacity.
        </p>
      </div>

      {/* Clerk Payment Pricing Table */}
      <div className="w-full flex justify-center py-2">
        <div className="w-full max-w-4xl">
          <PricingTable />
        </div>
      </div>
    </div>
  )
}

export default Pricing
