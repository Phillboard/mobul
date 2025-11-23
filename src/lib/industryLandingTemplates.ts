/**
 * Industry-Specific Landing Page Starter Templates
 * Phase 2.1: Professional templates optimized for conversion
 */

import type { TemplateVariable } from './landingPageTemplates';

export interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  thumbnailUrl: string;
  defaultValues: Partial<TemplateVariable>;
  generateHTML: (vars: TemplateVariable) => string;
}

export const industryTemplates: Record<string, IndustryTemplate> = {
  realEstate: {
    id: 'real-estate-luxury',
    name: 'Luxury Real Estate Showcase',
    industry: 'Real Estate',
    description: 'High-end property listings with premium design',
    thumbnailUrl: '/src/assets/template-previews/realtor-listing.jpg',
    defaultValues: {
      headline: 'Your Dream Home Awaits',
      subheadline: 'Exclusive access to luxury properties in your area',
      benefit1: 'Instant $50 Amazon Gift Card',
      benefit2: 'Free Home Valuation',
      benefit3: 'VIP Property Tours',
      ctaText: 'Schedule Your Tour',
      primaryColor: '#2c5282',
      accentColor: '#c05621',
    },
    generateHTML: (vars) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        h1, h2 { font-family: 'Playfair Display', serif; }
        .loading { display: none; }
        img[loading="lazy"] { min-height: 300px; }
    </style>
</head>
<body class="bg-gray-50">
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            ${vars.logoUrl ? `<img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-12" loading="eager" />` : 
            `<div class="text-2xl font-bold" style="color: ${vars.primaryColor};">${vars.companyName}</div>`}
            <div class="flex items-center gap-2 text-sm">
                <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path>
                </svg>
                <span class="font-medium text-gray-700">Trusted Real Estate Advisor</span>
            </div>
        </div>
    </header>

    <main>
        <!-- Hero Section -->
        <section class="relative py-20 lg:py-32 overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" style="opacity: 0.95;"></div>
            <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div class="text-white">
                        <h1 class="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            ${vars.headline}
                        </h1>
                        <p class="text-xl lg:text-2xl mb-8 text-gray-200">
                            ${vars.subheadline}
                        </p>
                        <div class="flex flex-wrap gap-4">
                            <div class="flex items-center gap-2">
                                <svg class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                                <span class="font-semibold">5-Star Service</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                                </svg>
                                <span class="font-semibold">Instant Reward</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-2xl p-8 lg:p-10">
                        <div class="text-center mb-8">
                            <div class="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                                🎁 LIMITED TIME OFFER
                            </div>
                            <h2 class="text-4xl font-bold mb-4" style="color: ${vars.textColor};">
                                Claim Your $${vars.giftCardValue}
                            </h2>
                            <p class="text-lg text-gray-600">
                                ${vars.giftCardBrand} Gift Card
                            </p>
                        </div>

                        <form id="giftCardRedemptionForm" class="space-y-4">
                            <div>
                                <label for="codeInput" class="block text-sm font-semibold mb-2 text-gray-700">
                                    Enter Your Redemption Code
                                </label>
                                <input
                                    type="text"
                                    id="codeInput"
                                    name="code"
                                    placeholder="ABC-12345"
                                    required
                                    class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <button
                                type="submit"
                                id="submitButton"
                                class="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                            >
                                Claim My ${vars.giftCardBrand} Gift Card
                            </button>
                        </form>

                        <p class="text-center text-sm text-gray-500 mt-4">
                            🔒 Secure redemption • No spam • Instant delivery
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Benefits Section -->
        <section class="py-16 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-12">
                    <h2 class="text-3xl font-bold mb-4" style="color: ${vars.textColor};">Why Choose Us?</h2>
                </div>
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${vars.benefit1}</h3>
                        <p class="text-gray-600">Claim your reward instantly after touring</p>
                    </div>
                    <div class="text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${vars.benefit2}</h3>
                        <p class="text-gray-600">Know your home's worth in minutes</p>
                    </div>
                    <div class="text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                            <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${vars.benefit3}</h3>
                        <p class="text-gray-600">Exclusive access to premium listings</p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="bg-gray-900 text-white py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>© ${new Date().getFullYear()} ${vars.companyName}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`
  },

  automotive: {
    id: 'auto-service-promo',
    name: 'Auto Service Appointment',
    industry: 'Automotive',
    description: 'Professional service booking with instant rewards',
    thumbnailUrl: '/src/assets/template-previews/auto-service.jpg',
    defaultValues: {
      headline: 'Get $50 Back on Your Next Service',
      subheadline: 'Professional auto care with rewards you can trust',
      benefit1: 'Same-Day Service',
      benefit2: 'Certified Technicians',
      benefit3: 'Free Inspection',
      ctaText: 'Schedule Service',
      primaryColor: '#c53030',
      accentColor: '#2d3748',
    },
    generateHTML: (vars) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .slide-in { animation: slideInRight 0.6s ease-out; }
    </style>
</head>
<body class="bg-gradient-to-br from-red-50 to-gray-100">
    <div class="min-h-screen py-12 px-4">
        <div class="max-w-4xl mx-auto">
            ${vars.logoUrl ? `<div class="text-center mb-8"><img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-16 mx-auto" /></div>` : ''}
            
            <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div class="bg-gradient-to-r from-red-600 to-gray-800 p-8 text-white text-center">
                    <h1 class="text-4xl lg:text-5xl font-bold mb-4">${vars.headline}</h1>
                    <p class="text-xl">${vars.subheadline}</p>
                </div>

                <div class="p-8 lg:p-12">
                    <div class="grid md:grid-cols-2 gap-8 mb-8">
                        <div class="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 text-center slide-in">
                            <div class="text-6xl font-black text-red-600 mb-2">$${vars.giftCardValue}</div>
                            <div class="text-lg font-semibold text-gray-700">${vars.giftCardBrand} Gift Card</div>
                            <div class="text-sm text-gray-600 mt-2">When you complete service</div>
                        </div>

                        <form id="giftCardRedemptionForm" class="space-y-4">
                            <h3 class="text-xl font-bold text-center mb-4">Claim Your Reward</h3>
                            <input
                                type="text"
                                id="codeInput"
                                name="code"
                                placeholder="Enter your code"
                                required
                                class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 transition-colors"
                            />
                            <button
                                type="submit"
                                class="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg"
                            >
                                Redeem Now
                            </button>
                        </form>
                    </div>

                    <div class="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                        <div class="text-center">
                            <div class="text-3xl mb-2">✓</div>
                            <div class="font-semibold text-sm">${vars.benefit1}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-3xl mb-2">🔧</div>
                            <div class="font-semibold text-sm">${vars.benefit2}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-3xl mb-2">🎁</div>
                            <div class="font-semibold text-sm">${vars.benefit3}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
  },

  healthcare: {
    id: 'healthcare-appointment',
    name: 'Healthcare Check-up Incentive',
    industry: 'Healthcare',
    description: 'Trust-building design for medical appointments',
    thumbnailUrl: '/src/assets/template-previews/healthcare-checkup.jpg',
    defaultValues: {
      headline: 'Your Health Matters',
      subheadline: 'Schedule your annual check-up and receive a gift',
      benefit1: 'Expert Care',
      benefit2: 'Same-Day Appointments',
      benefit3: 'Most Insurance Accepted',
      ctaText: 'Book Appointment',
      primaryColor: '#2c7a7b',
      accentColor: '#4299e1',
    },
    generateHTML: (vars) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gradient-to-b from-teal-50 to-white">
    <header class="bg-white shadow-sm">
        <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            ${vars.logoUrl ? `<img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-10" />` : 
            `<div class="text-xl font-bold text-teal-700">${vars.companyName}</div>`}
            <div class="flex items-center gap-2 text-sm">
                <svg class="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span class="font-medium text-gray-700">HIPAA Compliant</span>
            </div>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-12">
        <div class="text-center mb-12">
            <h1 class="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">${vars.headline}</h1>
            <p class="text-xl text-gray-600">${vars.subheadline}</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-8 items-center">
            <div>
                <div class="bg-white rounded-2xl shadow-xl p-8">
                    <div class="text-center mb-6">
                        <div class="inline-block bg-teal-100 rounded-full px-4 py-2 mb-4">
                            <span class="text-teal-700 font-semibold">Thank You Gift</span>
                        </div>
                        <div class="text-5xl font-bold text-teal-600 mb-2">$${vars.giftCardValue}</div>
                        <div class="text-lg text-gray-700">${vars.giftCardBrand} Gift Card</div>
                    </div>

                    <form id="giftCardRedemptionForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2 text-gray-700">Your Redemption Code</label>
                            <input
                                type="text"
                                id="codeInput"
                                name="code"
                                placeholder="Enter code here"
                                required
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            class="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-colors"
                        >
                            Claim Gift Card
                        </button>
                    </form>
                </div>
            </div>

            <div class="space-y-6">
                <div class="flex gap-4">
                    <div class="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg mb-1">${vars.benefit1}</h3>
                        <p class="text-gray-600">Board-certified physicians with years of experience</p>
                    </div>
                </div>
                <div class="flex gap-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg mb-1">${vars.benefit2}</h3>
                        <p class="text-gray-600">Get seen quickly with flexible scheduling</p>
                    </div>
                </div>
                <div class="flex gap-4">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg mb-1">${vars.benefit3}</h3>
                        <p class="text-gray-600">We work with all major insurance providers</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="bg-gray-50 mt-16 py-8 text-center text-gray-600 text-sm">
        <p>© ${new Date().getFullYear()} ${vars.companyName}. HIPAA Compliant & Secure</p>
    </footer>
</body>
</html>`
  },

  financial: {
    id: 'financial-advisor',
    name: 'Financial Advisory Consultation',
    industry: 'Financial Services',
    description: 'Professional and trustworthy financial services design',
    thumbnailUrl: '/src/assets/template-previews/financial-advisor.jpg',
    defaultValues: {
      headline: 'Secure Your Financial Future',
      subheadline: 'Free consultation with certified financial advisors',
      benefit1: 'Fiduciary Advice',
      benefit2: 'No Hidden Fees',
      benefit3: 'Personalized Plans',
      ctaText: 'Schedule Consultation',
      primaryColor: '#1e40af',
      accentColor: '#059669',
    },
    generateHTML: (vars) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gray-50">
    <header class="bg-white border-b">
        <div class="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
            ${vars.logoUrl ? `<img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-10" />` : 
            `<div class="text-xl font-bold text-blue-900">${vars.companyName}</div>`}
            <div class="flex items-center gap-2 text-sm">
                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span class="font-semibold text-gray-700">SEC Registered</span>
            </div>
        </div>
    </header>

    <main>
        <section class="py-16 bg-gradient-to-b from-blue-50 to-white">
            <div class="max-w-6xl mx-auto px-4">
                <div class="text-center mb-12">
                    <h1 class="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">${vars.headline}</h1>
                    <p class="text-xl text-gray-600">${vars.subheadline}</p>
                </div>

                <div class="grid lg:grid-cols-2 gap-12 items-start">
                    <div class="bg-white rounded-xl shadow-lg p-8">
                        <div class="text-center mb-6">
                            <div class="inline-block bg-green-100 rounded-lg px-4 py-2 mb-4">
                                <span class="text-green-700 font-semibold">Limited Time Offer</span>
                            </div>
                            <div class="text-5xl font-bold text-blue-900 mb-2">$${vars.giftCardValue}</div>
                            <div class="text-lg text-gray-700 mb-1">${vars.giftCardBrand} Gift Card</div>
                            <div class="text-sm text-gray-500">After your complimentary consultation</div>
                        </div>

                        <form id="giftCardRedemptionForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">Redemption Code</label>
                                <input
                                    type="text"
                                    id="codeInput"
                                    name="code"
                                    placeholder="Enter your code"
                                    required
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                class="w-full py-4 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold transition-colors"
                            >
                                Claim Your Gift Card
                            </button>
                        </form>

                        <p class="text-center text-xs text-gray-500 mt-4">
                            🔒 Your information is secure and confidential
                        </p>
                    </div>

                    <div class="space-y-6">
                        <h2 class="text-2xl font-bold">Why Choose Our Advisory Services?</h2>
                        <div class="space-y-4">
                            <div class="flex gap-3">
                                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg class="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="font-bold">${vars.benefit1}</h3>
                                    <p class="text-gray-600 text-sm">We're legally obligated to act in your best interest</p>
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="font-bold">${vars.benefit2}</h3>
                                    <p class="text-gray-600 text-sm">Transparent pricing with no surprises</p>
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg class="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="font-bold">${vars.benefit3}</h3>
                                    <p class="text-gray-600 text-sm">Customized strategies for your unique situation</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-blue-50 rounded-lg p-6 mt-8">
                            <h3 class="font-bold mb-2">What to Expect:</h3>
                            <ul class="space-y-2 text-sm text-gray-700">
                                <li>✓ 60-minute complimentary consultation</li>
                                <li>✓ Review of your current financial situation</li>
                                <li>✓ Personalized recommendations</li>
                                <li>✓ No obligation to continue</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="bg-gray-900 text-white py-8 text-center text-sm">
        <p>© ${new Date().getFullYear()} ${vars.companyName}. SEC Registered Investment Advisor.</p>
        <p class="text-gray-400 mt-2">Securities offered through registered representatives.</p>
    </footer>
</body>
</html>`
  },

  fitness: {
    id: 'fitness-membership',
    name: 'Gym Membership Promotion',
    industry: 'Fitness',
    description: 'High-energy design for fitness centers and gyms',
    thumbnailUrl: '/src/assets/template-previews/fitness-gym.jpg',
    defaultValues: {
      headline: 'Transform Your Body',
      subheadline: 'Join today and receive an exclusive welcome gift',
      benefit1: '24/7 Access',
      benefit2: 'Personal Training',
      benefit3: 'Modern Equipment',
      ctaText: 'Start Free Trial',
      primaryColor: '#c53030',
      accentColor: '#d69e2e',
    },
    generateHTML: (vars) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        h1, h2 { font-family: 'Oswald', sans-serif; letter-spacing: -0.02em; }
        body { font-family: 'Inter', sans-serif; }
        @keyframes pulse-grow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .pulse-grow { animation: pulse-grow 2s ease-in-out infinite; }
    </style>
</head>
<body class="bg-black text-white">
    <div class="relative min-h-screen bg-gradient-to-br from-red-900/30 to-black">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0djIyYTQgNCAwIDAgMS00IDRIMTRhNCA0IDAgMCAxLTQtNFYxNGE0IDQgMCAwIDEgNC00aDIyYTQgNCAwIDAgMSA0IDR6TTEwIDEwdjQwYTQgNCAwIDAgMCA0IDRoNDBhNCA0IDAgMCAwIDQtNFYxMGE0IDQgMCAwIDAtNC00SDEweiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
        
        <div class="relative max-w-6xl mx-auto px-4 py-12">
            ${vars.logoUrl ? `<div class="text-center mb-8"><img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-16 mx-auto" /></div>` : 
            `<div class="text-center mb-8"><div class="text-3xl font-bold text-red-500">${vars.companyName}</div></div>`}
            
            <div class="text-center mb-12">
                <h1 class="text-6xl lg:text-7xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                    ${vars.headline}
                </h1>
                <p class="text-2xl text-gray-300">${vars.subheadline}</p>
            </div>

            <div class="grid lg:grid-cols-2 gap-8 items-center mb-16">
                <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-10 text-center pulse-grow">
                    <div class="text-7xl font-black mb-4">$${vars.giftCardValue}</div>
                    <div class="text-2xl font-bold mb-2">${vars.giftCardBrand}</div>
                    <div class="text-lg text-red-100">Gift Card Waiting for You!</div>
                    <div class="mt-6 flex justify-center gap-2">
                        <span class="text-4xl">🏋️</span>
                        <span class="text-4xl">💪</span>
                        <span class="text-4xl">🔥</span>
                    </div>
                </div>

                <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8">
                    <h3 class="text-2xl font-bold mb-6 text-center">CLAIM YOUR REWARD</h3>
                    <form id="giftCardRedemptionForm" class="space-y-4">
                        <input
                            type="text"
                            id="codeInput"
                            name="code"
                            placeholder="ENTER YOUR CODE"
                            required
                            class="w-full px-6 py-4 bg-black/50 border-2 border-red-500 rounded-xl text-white text-center text-lg font-bold uppercase tracking-wider focus:border-yellow-500 focus:outline-none placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            class="w-full py-5 bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 text-white rounded-xl font-black text-xl transition-all transform hover:scale-105 shadow-2xl"
                        >
                            💥 GET MY GIFT CARD NOW!
                        </button>
                    </form>
                </div>
            </div>

            <div class="grid md:grid-cols-3 gap-6 text-center">
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                    <div class="text-4xl mb-3">🕐</div>
                    <h3 class="text-xl font-bold mb-2">${vars.benefit1}</h3>
                    <p class="text-gray-400">Work out on your schedule</p>
                </div>
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                    <div class="text-4xl mb-3">👤</div>
                    <h3 class="text-xl font-bold mb-2">${vars.benefit2}</h3>
                    <p class="text-gray-400">Expert trainers to guide you</p>
                </div>
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                    <div class="text-4xl mb-3">⚡</div>
                    <h3 class="text-xl font-bold mb-2">${vars.benefit3}</h3>
                    <p class="text-gray-400">State-of-the-art facility</p>
                </div>
            </div>
        </div>
    </div>

    <footer class="bg-black border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <p>© ${new Date().getFullYear()} ${vars.companyName}. All Rights Reserved.</p>
    </footer>
</body>
</html>`
  },
};

export const templateCategories = [
  {
    category: 'Real Estate',
    templates: ['realEstate'],
    icon: '🏠',
  },
  {
    category: 'Automotive',
    templates: ['automotive'],
    icon: '🚗',
  },
  {
    category: 'Healthcare',
    templates: ['healthcare'],
    icon: '⚕️',
  },
  {
    category: 'Financial',
    templates: ['financial'],
    icon: '💼',
  },
  {
    category: 'Fitness',
    templates: ['fitness'],
    icon: '💪',
  },
];
