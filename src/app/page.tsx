import Link from "next/link";
import {
  Shield,
  Heart,
  FileText,
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            <span className="font-bold text-gray-900 text-lg">Funeral Cover Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Adviser Login
            </Link>
            <Link
              href="/wizard/step/1"
              className="hidden sm:inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 via-green-600 to-green-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-full mb-6">
              <Shield className="w-4 h-4" />
              FAIS Compliant Advice
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Protect Your Family's
              <br />
              <span className="text-green-200">Final Farewell</span>
            </h1>
            <p className="text-lg sm:text-xl text-green-100 leading-relaxed mb-8">
              Give your loved ones the dignified funeral they deserve. Our guided
              process helps you find the right cover for your family — in under
              10 minutes, with expert FAIS-compliant advice every step of the way.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/wizard/step/1"
                className="inline-flex items-center justify-center gap-2 bg-white text-green-700 font-bold px-6 py-3.5 rounded-xl hover:bg-green-50 transition-colors text-base shadow-lg"
              >
                Get Started — It&apos;s Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="tel:+27000000000"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-medium px-6 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                <Phone className="w-5 h-5" />
                Speak to an Adviser
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-extrabold text-green-400 mb-1">R56,000+</div>
              <div className="text-sm text-gray-400">Average SA funeral cost</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-green-400 mb-1">9 steps</div>
              <div className="text-sm text-gray-400">To complete your cover</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-green-400 mb-1">FAIS</div>
              <div className="text-sm text-gray-400">Compliant advice process</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Everything you need, in one place
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From calculating costs to signing your policy — our guided wizard walks
              you through every step with clear, honest advice.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Funeral Calculator</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Estimate real funeral costs — coffin, catering, transport, tombstone
                and more — so you know exactly how much cover you need.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Family Cover</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Add your spouse, children, parents and extended family. Customise
                cover amounts for each member of your household.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Expert Advice</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Receive a personalised Record of Advice (ROA) that meets FAIS
                requirements — transparently and honestly.
              </p>
            </div>
            {/* Card 4 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Digital Process</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sign digitally and complete your application online. Save progress
                and return anytime — no paperwork required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              How it works
            </h2>
            <p className="text-gray-500">Simple, transparent, and completely free.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Estimate your costs",
                desc: "Use our calculator to get a realistic picture of funeral expenses in South Africa.",
              },
              {
                step: "2",
                title: "Get a recommendation",
                desc: "Based on your needs and budget, we'll match you to the right funeral cover product.",
              },
              {
                step: "3",
                title: "Sign & protect",
                desc: "Review your Record of Advice, sign digitally, and your family is covered.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-green-600 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to protect your family?
          </h2>
          <p className="text-green-100 mb-8 text-lg">
            Join thousands of South African families who have secured dignified
            funeral cover through Fairbairn Consult.
          </p>
          <Link
            href="/wizard/step/1"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-colors text-base shadow-lg"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-green-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> No obligation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> FAIS compliant
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Save & return anytime
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-white">Funeral Cover Studio</span>
              <span className="text-gray-500 text-sm">by Fairbairn Consult</span>
            </div>
            <div className="text-xs text-gray-500 max-w-xl leading-relaxed">
              Fairbairn Consult is an authorised Financial Services Provider (FSP) regulated by
              the Financial Sector Conduct Authority (FSCA) in terms of the Financial Advisory and
              Intermediary Services Act, 37 of 2002 (FAIS Act). This platform provides general
              financial advice. Past performance is not indicative of future results. Cover is
              subject to underwriting and policy terms.
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-600 text-center">
            &copy; {new Date().getFullYear()} Fairbairn Consult. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
