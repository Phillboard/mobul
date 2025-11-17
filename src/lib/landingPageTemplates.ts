// Professional landing page templates with systematic branding injection

export interface TemplateVariable {
  companyName: string;
  industry: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headline: string;
  subheadline: string;
  benefit1: string;
  benefit2: string;
  benefit3: string;
  ctaText: string;
  giftCardBrand: string;
  giftCardValue: string;
  logoUrl?: string;
}

export interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  emotionalTone: string[];
  designStyle: string;
  generateHTML: (vars: TemplateVariable) => string;
}

// Helper to generate color variations
function generateColorShades(baseColor: string) {
  // Simple shade generation - could be enhanced with proper color libraries
  return {
    light: baseColor,
    base: baseColor,
    dark: baseColor,
  };
}

export const templates: Record<string, LandingPageTemplate> = {
  modernLuxury: {
    id: "modern-luxury",
    name: "Modern Luxury",
    description: "Premium design with sophisticated animations and gradients",
    bestFor: ["auto", "realestate", "financial", "luxury"],
    emotionalTone: ["professional", "trustworthy", "premium"],
    designStyle: "modern",
    generateHTML: (vars: TemplateVariable) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '${vars.primaryColor}',
                        accent: '${vars.accentColor}',
                        background: '${vars.backgroundColor}',
                    }
                }
            }
        }
    </script>
    <style>
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-delay-200 { animation-delay: 0.2s; }
        .animate-delay-400 { animation-delay: 0.4s; }
        .gradient-shimmer {
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            background-size: 1000px 100%;
            animation: shimmer 3s infinite;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
    <!-- Hero Section -->
    <div class="relative min-h-screen flex items-center justify-center overflow-hidden">
        <!-- Animated Background -->
        <div class="absolute inset-0 bg-gradient-to-br opacity-10" style="background: linear-gradient(135deg, ${vars.primaryColor} 0%, ${vars.accentColor} 100%);"></div>
        
        <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <!-- Logo -->
            ${vars.logoUrl ? `
            <div class="flex justify-center mb-12 opacity-0 animate-fadeInUp">
                <img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-16 w-auto" />
            </div>
            ` : ''}
            
            <!-- Main Content -->
            <div class="text-center mb-16">
                <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 opacity-0 animate-fadeInUp" style="color: ${vars.textColor};">
                    ${vars.headline}
                </h1>
                <p class="text-xl sm:text-2xl mb-8 opacity-0 animate-fadeInUp animate-delay-200" style="color: ${vars.textColor}; opacity: 0.8;">
                    ${vars.subheadline}
                </p>
            </div>

            <!-- Gift Card Visual -->
            <div class="max-w-2xl mx-auto mb-16 opacity-0 animate-fadeInUp animate-delay-400">
                <div class="relative bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-transform duration-300">
                    <div class="absolute inset-0 gradient-shimmer rounded-3xl"></div>
                    <div class="relative text-center">
                        <div class="inline-block bg-gradient-to-r p-1 rounded-2xl mb-6" style="background: linear-gradient(135deg, ${vars.primaryColor}, ${vars.accentColor});">
                            <div class="bg-white rounded-2xl px-8 py-4">
                                <span class="text-6xl font-bold" style="color: ${vars.primaryColor};">$${vars.giftCardValue}</span>
                            </div>
                        </div>
                        <h2 class="text-3xl font-bold mb-4" style="color: ${vars.textColor};">
                            ${vars.giftCardBrand} Gift Card
                        </h2>
                        <p class="text-lg" style="color: ${vars.textColor}; opacity: 0.7;">
                            Thank you for ${vars.ctaText.toLowerCase()}! Claim your reward below.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Redemption Form -->
            <div class="max-w-md mx-auto">
                <form id="giftCardRedemptionForm" class="bg-white rounded-2xl shadow-xl p-8 transform hover:shadow-2xl transition-shadow duration-300">
                    <label for="codeInput" class="block text-sm font-semibold mb-2" style="color: ${vars.textColor};">
                        Enter Your Gift Card Code
                    </label>
                    <input
                        type="text"
                        id="codeInput"
                        name="code"
                        placeholder="XXXX-XXXX-XXXX"
                        required
                        class="w-full px-4 py-3 border-2 rounded-xl mb-4 text-lg focus:ring-2 focus:border-transparent transition-all"
                        style="border-color: ${vars.primaryColor}20; focus:ring-color: ${vars.primaryColor};"
                    />
                    <button
                        type="submit"
                        id="submitButton"
                        class="w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300"
                        style="background: linear-gradient(135deg, ${vars.primaryColor}, ${vars.accentColor});"
                    >
                        Claim Your ${vars.giftCardBrand} Gift Card
                    </button>
                </form>
            </div>

            <!-- Benefits Grid -->
            <div class="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
                <div class="text-center p-6 bg-white bg-opacity-50 rounded-2xl backdrop-blur-sm transform hover:-translate-y-2 transition-transform duration-300">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background: ${vars.primaryColor}20;">
                        <svg class="w-8 h-8" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 class="font-bold text-xl mb-2" style="color: ${vars.textColor};">${vars.benefit1}</h3>
                </div>
                <div class="text-center p-6 bg-white bg-opacity-50 rounded-2xl backdrop-blur-sm transform hover:-translate-y-2 transition-transform duration-300">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background: ${vars.accentColor}20;">
                        <svg class="w-8 h-8" style="color: ${vars.accentColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 class="font-bold text-xl mb-2" style="color: ${vars.textColor};">${vars.benefit2}</h3>
                </div>
                <div class="text-center p-6 bg-white bg-opacity-50 rounded-2xl backdrop-blur-sm transform hover:-translate-y-2 transition-transform duration-300">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background: ${vars.primaryColor}20;">
                        <svg class="w-8 h-8" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 class="font-bold text-xl mb-2" style="color: ${vars.textColor};">${vars.benefit3}</h3>
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center mt-20">
                <p class="text-sm" style="color: ${vars.textColor}; opacity: 0.6;">
                    © ${new Date().getFullYear()} ${vars.companyName}. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`
  },

  boldEnergetic: {
    id: "bold-energetic",
    name: "Bold & Energetic",
    description: "Vibrant design with high contrast and dynamic animations",
    bestFor: ["fitness", "events", "entertainment", "retail"],
    emotionalTone: ["exciting", "friendly", "energetic"],
    designStyle: "bold",
    generateHTML: (vars: TemplateVariable) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px ${vars.accentColor}40; }
            50% { box-shadow: 0 0 40px ${vars.accentColor}80; }
        }
        @keyframes bounce-in {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
        }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .bounce-in { animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
    </style>
</head>
<body style="background: linear-gradient(135deg, ${vars.primaryColor} 0%, ${vars.accentColor} 100%);" class="min-h-screen">
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
        <div class="max-w-4xl w-full">
            ${vars.logoUrl ? `
            <div class="text-center mb-8 bounce-in">
                <img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-20 w-auto mx-auto filter drop-shadow-2xl" />
            </div>
            ` : ''}
            
            <div class="text-center text-white mb-12 bounce-in" style="animation-delay: 0.1s;">
                <h1 class="text-6xl sm:text-7xl lg:text-8xl font-black mb-6 drop-shadow-2xl">
                    ${vars.headline}
                </h1>
                <p class="text-2xl sm:text-3xl font-bold opacity-90 drop-shadow-lg">
                    ${vars.subheadline}
                </p>
            </div>

            <!-- Giant Gift Card -->
            <div class="mb-12 bounce-in pulse-glow" style="animation-delay: 0.2s;">
                <div class="bg-white rounded-3xl p-12 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <div class="text-center">
                        <div class="inline-block mb-6">
                            <div class="text-8xl font-black bg-clip-text text-transparent" style="background-image: linear-gradient(135deg, ${vars.primaryColor}, ${vars.accentColor});">
                                $${vars.giftCardValue}
                            </div>
                        </div>
                        <h2 class="text-4xl font-black mb-4" style="color: ${vars.textColor};">
                            ${vars.giftCardBrand} GIFT CARD
                        </h2>
                        <p class="text-xl font-bold" style="color: ${vars.textColor};">
                            🎉 YOU EARNED IT! 🎉
                        </p>
                    </div>
                </div>
            </div>

            <!-- Redemption Form -->
            <div class="mb-12 bounce-in" style="animation-delay: 0.3s;">
                <form id="giftCardRedemptionForm" class="bg-white rounded-3xl p-8 shadow-2xl">
                    <label for="codeInput" class="block text-xl font-bold mb-3 text-center" style="color: ${vars.textColor};">
                        ⚡ ENTER YOUR CODE ⚡
                    </label>
                    <input
                        type="text"
                        id="codeInput"
                        name="code"
                        placeholder="XXXX-XXXX-XXXX"
                        required
                        class="w-full px-6 py-4 border-4 rounded-2xl mb-6 text-xl font-bold text-center uppercase tracking-widest"
                        style="border-color: ${vars.primaryColor};"
                    />
                    <button
                        type="submit"
                        id="submitButton"
                        class="w-full py-6 rounded-2xl font-black text-2xl text-white shadow-2xl transform hover:scale-105 transition-all duration-300"
                        style="background: linear-gradient(135deg, ${vars.accentColor}, ${vars.primaryColor});"
                    >
                        🚀 CLAIM NOW!
                    </button>
                </form>
            </div>

            <!-- Benefits -->
            <div class="grid grid-cols-3 gap-6 text-center text-white">
                <div class="bounce-in" style="animation-delay: 0.4s;">
                    <div class="text-4xl mb-2">✓</div>
                    <div class="font-bold">${vars.benefit1}</div>
                </div>
                <div class="bounce-in" style="animation-delay: 0.5s;">
                    <div class="text-4xl mb-2">⚡</div>
                    <div class="font-bold">${vars.benefit2}</div>
                </div>
                <div class="bounce-in" style="animation-delay: 0.6s;">
                    <div class="text-4xl mb-2">🎁</div>
                    <div class="font-bold">${vars.benefit3}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
  },

  professionalTrust: {
    id: "professional-trust",
    name: "Professional Trust",
    description: "Clean, trustworthy design for professional services",
    bestFor: ["financial", "legal", "healthcare", "insurance"],
    emotionalTone: ["professional", "trustworthy", "secure"],
    designStyle: "professional",
    generateHTML: (vars: TemplateVariable) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b" style="border-color: ${vars.primaryColor}20;">
        <div class="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
            ${vars.logoUrl ? `<img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-12" />` : `<div class="text-2xl font-bold" style="color: ${vars.primaryColor};">${vars.companyName}</div>`}
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <span class="text-sm font-medium" style="color: ${vars.textColor};">Secure & Verified</span>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-5xl mx-auto px-6 py-16">
        <div class="text-center mb-16">
            <h1 class="text-4xl sm:text-5xl font-bold mb-4" style="color: ${vars.textColor};">
                ${vars.headline}
            </h1>
            <p class="text-xl" style="color: ${vars.textColor}; opacity: 0.7;">
                ${vars.subheadline}
            </p>
        </div>

        <div class="grid md:grid-cols-2 gap-12 items-center mb-16">
            <!-- Gift Card Display -->
            <div>
                <div class="bg-white rounded-xl shadow-lg p-8 border" style="border-color: ${vars.primaryColor}20;">
                    <div class="text-center">
                        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style="background: ${vars.primaryColor}10;">
                            <svg class="w-10 h-10" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div class="text-5xl font-bold mb-2" style="color: ${vars.primaryColor};">
                            $${vars.giftCardValue}
                        </div>
                        <div class="text-2xl font-semibold mb-4" style="color: ${vars.textColor};">
                            ${vars.giftCardBrand} Gift Card
                        </div>
                        <p class="text-sm" style="color: ${vars.textColor}; opacity: 0.6;">
                            Congratulations on ${vars.ctaText.toLowerCase()}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Redemption Form -->
            <div>
                <form id="giftCardRedemptionForm" class="bg-white rounded-xl shadow-lg p-8 border" style="border-color: ${vars.primaryColor}20;">
                    <h2 class="text-2xl font-bold mb-6" style="color: ${vars.textColor};">Claim Your Reward</h2>
                    
                    <label for="codeInput" class="block text-sm font-semibold mb-2" style="color: ${vars.textColor};">
                        Gift Card Code
                    </label>
                    <input
                        type="text"
                        id="codeInput"
                        name="code"
                        placeholder="Enter your code"
                        required
                        class="w-full px-4 py-3 border rounded-lg mb-6 focus:outline-none focus:ring-2"
                        style="border-color: ${vars.primaryColor}30; focus:ring-color: ${vars.primaryColor}50;"
                    />
                    
                    <button
                        type="submit"
                        id="submitButton"
                        class="w-full py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                        style="background: ${vars.primaryColor};"
                    >
                        Verify and Claim
                    </button>
                    
                    <div class="mt-6 flex items-start gap-2 text-xs" style="color: ${vars.textColor}; opacity: 0.5;">
                        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                        </svg>
                        <span>Your information is encrypted and secure</span>
                    </div>
                </form>
            </div>
        </div>

        <!-- Benefits -->
        <div class="grid md:grid-cols-3 gap-8">
            <div class="flex gap-4">
                <div class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style="background: ${vars.primaryColor}10;">
                    <svg class="w-6 h-6" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <div>
                    <h3 class="font-semibold mb-1" style="color: ${vars.textColor};">${vars.benefit1}</h3>
                </div>
            </div>
            <div class="flex gap-4">
                <div class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style="background: ${vars.accentColor}10;">
                    <svg class="w-6 h-6" style="color: ${vars.accentColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <h3 class="font-semibold mb-1" style="color: ${vars.textColor};">${vars.benefit2}</h3>
                </div>
            </div>
            <div class="flex gap-4">
                <div class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style="background: ${vars.primaryColor}10;">
                    <svg class="w-6 h-6" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
                <div>
                    <h3 class="font-semibold mb-1" style="color: ${vars.textColor};">${vars.benefit3}</h3>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="border-t mt-16" style="border-color: ${vars.primaryColor}20;">
        <div class="max-w-5xl mx-auto px-6 py-8 text-center text-sm" style="color: ${vars.textColor}; opacity: 0.5;">
            © ${new Date().getFullYear()} ${vars.companyName}. All rights reserved.
        </div>
    </footer>
</body>
</html>`
  },

  warmFriendly: {
    id: "warm-friendly",
    name: "Warm & Friendly",
    description: "Inviting design with approachable aesthetics",
    bestFor: ["restaurant", "retail", "homeservices", "hospitality"],
    emotionalTone: ["friendly", "approachable", "welcoming"],
    designStyle: "friendly",
    generateHTML: (vars: TemplateVariable) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body style="background: linear-gradient(180deg, ${vars.backgroundColor} 0%, ${vars.primaryColor}10 100%);">
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
        <div class="max-w-3xl w-full">
            ${vars.logoUrl ? `
            <div class="text-center mb-8">
                <img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-16 w-auto mx-auto" />
            </div>
            ` : ''}
            
            <div class="text-center mb-12">
                <h1 class="text-5xl sm:text-6xl font-bold mb-4" style="color: ${vars.textColor};">
                    ${vars.headline} 🎉
                </h1>
                <p class="text-2xl" style="color: ${vars.textColor}; opacity: 0.8;">
                    ${vars.subheadline}
                </p>
            </div>

            <!-- Gift Card -->
            <div class="bg-white rounded-3xl shadow-xl p-10 mb-8 transform hover:scale-105 transition-transform duration-300">
                <div class="text-center">
                    <div class="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full p-4 mb-6">
                        <span class="text-6xl">🎁</span>
                    </div>
                    <div class="text-5xl font-black mb-3" style="color: ${vars.primaryColor};">
                        $${vars.giftCardValue}
                    </div>
                    <div class="text-2xl font-bold mb-2" style="color: ${vars.textColor};">
                        ${vars.giftCardBrand} Gift Card
                    </div>
                    <p class="text-lg" style="color: ${vars.textColor}; opacity: 0.7;">
                        Thank you for ${vars.ctaText.toLowerCase()}! ❤️
                    </p>
                </div>
            </div>

            <!-- Form -->
            <form id="giftCardRedemptionForm" class="bg-white rounded-3xl shadow-xl p-8 mb-8">
                <label for="codeInput" class="block text-lg font-bold mb-3 text-center" style="color: ${vars.textColor};">
                    Enter Your Gift Card Code 👇
                </label>
                <input
                    type="text"
                    id="codeInput"
                    name="code"
                    placeholder="XXXX-XXXX-XXXX"
                    required
                    class="w-full px-6 py-4 border-2 rounded-2xl mb-4 text-lg text-center font-semibold"
                    style="border-color: ${vars.primaryColor};"
                />
                <button
                    type="submit"
                    id="submitButton"
                    class="w-full py-4 rounded-2xl font-bold text-xl text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    style="background: ${vars.primaryColor};"
                >
                    Claim My Gift Card! 🎁
                </button>
            </form>

            <!-- Benefits -->
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-white rounded-2xl p-6 shadow-md">
                    <div class="text-3xl mb-2">✨</div>
                    <div class="font-semibold text-sm" style="color: ${vars.textColor};">${vars.benefit1}</div>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-md">
                    <div class="text-3xl mb-2">⚡</div>
                    <div class="font-semibold text-sm" style="color: ${vars.textColor};">${vars.benefit2}</div>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-md">
                    <div class="text-3xl mb-2">💯</div>
                    <div class="font-semibold text-sm" style="color: ${vars.textColor};">${vars.benefit3}</div>
                </div>
            </div>

            <div class="text-center mt-12 text-sm" style="color: ${vars.textColor}; opacity: 0.6;">
                © ${new Date().getFullYear()} ${vars.companyName} • Made with ❤️
            </div>
        </div>
    </div>
</body>
</html>`
  },

  techModern: {
    id: "tech-modern",
    name: "Tech Modern",
    description: "Sleek, minimalist design for tech companies",
    bestFor: ["tech", "saas", "startup", "software"],
    emotionalTone: ["innovative", "modern", "cutting-edge"],
    designStyle: "tech",
    generateHTML: (vars: TemplateVariable) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        .float { animation: float 6s ease-in-out infinite; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    </style>
</head>
<body class="bg-black text-white min-h-screen">
    <div class="relative min-h-screen overflow-hidden">
        <!-- Grid Background -->
        <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(${vars.primaryColor}20 1px, transparent 1px), linear-gradient(90deg, ${vars.primaryColor}20 1px, transparent 1px); background-size: 50px 50px;"></div>
        
        <!-- Gradient Orb -->
        <div class="absolute top-0 right-0 w-96 h-96 rounded-full filter blur-3xl opacity-30 float" style="background: radial-gradient(circle, ${vars.primaryColor}, ${vars.accentColor});"></div>
        
        <div class="relative z-10 max-w-5xl mx-auto px-6 py-20">
            ${vars.logoUrl ? `
            <div class="mb-12">
                <img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-12 w-auto" />
            </div>
            ` : ''}
            
            <div class="mb-16">
                <h1 class="text-6xl sm:text-7xl font-bold mb-6 bg-clip-text text-transparent" style="background-image: linear-gradient(135deg, ${vars.primaryColor}, ${vars.accentColor});">
                    ${vars.headline}
                </h1>
                <p class="text-2xl text-gray-300 max-w-2xl">
                    ${vars.subheadline}
                </p>
            </div>

            <div class="grid md:grid-cols-2 gap-8 items-center">
                <!-- Gift Card Display -->
                <div class="relative">
                    <div class="absolute inset-0 rounded-2xl filter blur-xl opacity-50" style="background: linear-gradient(135deg, ${vars.primaryColor}, ${vars.accentColor});"></div>
                    <div class="relative bg-gradient-to-br from-gray-900 to-black border rounded-2xl p-8" style="border-color: ${vars.primaryColor};">
                        <div class="text-center">
                            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style="background: ${vars.primaryColor}20;">
                                <svg class="w-8 h-8" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div class="text-6xl font-black mb-2" style="color: ${vars.primaryColor};">
                                $${vars.giftCardValue}
                            </div>
                            <div class="text-xl font-semibold text-white mb-4">
                                ${vars.giftCardBrand} Gift Card
                            </div>
                            <div class="text-sm text-gray-400">
                                Reward unlocked for ${vars.ctaText.toLowerCase()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Redemption Form -->
                <div>
                    <form id="giftCardRedemptionForm" class="bg-gradient-to-br from-gray-900 to-black border rounded-2xl p-8" style="border-color: ${vars.primaryColor}30;">
                        <h2 class="text-2xl font-bold mb-6">Claim Reward</h2>
                        
                        <div class="mb-6">
                            <label for="codeInput" class="block text-sm font-medium mb-2 text-gray-400">
                                Redemption Code
                            </label>
                            <input
                                type="text"
                                id="codeInput"
                                name="code"
                                placeholder="XXXX-XXXX-XXXX"
                                required
                                class="w-full px-4 py-3 bg-black border rounded-lg text-white focus:outline-none focus:ring-2"
                                style="border-color: ${vars.primaryColor}30; focus:ring-color: ${vars.primaryColor};"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            id="submitButton"
                            class="w-full py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                            style="background: linear-gradient(135deg, ${vars.primaryColor}, ${vars.accentColor});"
                        >
                            Verify & Claim →
                        </button>
                    </form>
                </div>
            </div>

            <!-- Benefits -->
            <div class="grid md:grid-cols-3 gap-6 mt-16">
                <div class="border rounded-xl p-6" style="border-color: ${vars.primaryColor}30; background: ${vars.primaryColor}05;">
                    <div class="text-2xl mb-2" style="color: ${vars.primaryColor};">01</div>
                    <h3 class="font-semibold mb-2">${vars.benefit1}</h3>
                </div>
                <div class="border rounded-xl p-6" style="border-color: ${vars.accentColor}30; background: ${vars.accentColor}05;">
                    <div class="text-2xl mb-2" style="color: ${vars.accentColor};">02</div>
                    <h3 class="font-semibold mb-2">${vars.benefit2}</h3>
                </div>
                <div class="border rounded-xl p-6" style="border-color: ${vars.primaryColor}30; background: ${vars.primaryColor}05;">
                    <div class="text-2xl mb-2" style="color: ${vars.primaryColor};">03</div>
                    <h3 class="font-semibold mb-2">${vars.benefit3}</h3>
                </div>
            </div>

            <div class="mt-16 text-center text-sm text-gray-600">
                © ${new Date().getFullYear()} ${vars.companyName}
            </div>
        </div>
    </div>
</body>
</html>`
  },

  classicElegant: {
    id: "classic-elegant",
    name: "Classic Elegant",
    description: "Timeless design with sophisticated typography",
    bestFor: ["luxury", "legal", "consulting", "professional"],
    emotionalTone: ["sophisticated", "elegant", "timeless"],
    designStyle: "elegant",
    generateHTML: (vars: TemplateVariable) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vars.companyName} - ${vars.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        h1, h2 { font-family: 'Playfair Display', serif; }
    </style>
</head>
<body style="background: ${vars.backgroundColor};">
    <div class="min-h-screen">
        <!-- Header -->
        <header class="border-b" style="border-color: ${vars.primaryColor}20;">
            <div class="max-w-4xl mx-auto px-6 py-8 text-center">
                ${vars.logoUrl ? `
                <img src="${vars.logoUrl}" alt="${vars.companyName}" class="h-16 w-auto mx-auto mb-4" />
                ` : `
                <h1 class="text-4xl font-bold" style="color: ${vars.primaryColor};">${vars.companyName}</h1>
                `}
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-4xl mx-auto px-6 py-16">
            <div class="text-center mb-16">
                <h1 class="text-5xl sm:text-6xl font-bold mb-6" style="color: ${vars.textColor};">
                    ${vars.headline}
                </h1>
                <div class="w-24 h-1 mx-auto mb-6" style="background: ${vars.primaryColor};"></div>
                <p class="text-xl max-w-2xl mx-auto" style="color: ${vars.textColor}; opacity: 0.7;">
                    ${vars.subheadline}
                </p>
            </div>

            <!-- Gift Card Section -->
            <div class="bg-white rounded-lg shadow-xl p-12 mb-12 border" style="border-color: ${vars.primaryColor}20;">
                <div class="text-center">
                    <div class="inline-block border-4 rounded-full p-6 mb-6" style="border-color: ${vars.primaryColor}20;">
                        <svg class="w-12 h-12" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="text-6xl font-bold mb-4" style="color: ${vars.primaryColor};">
                        $${vars.giftCardValue}
                    </div>
                    <h2 class="text-3xl font-bold mb-2" style="color: ${vars.textColor};">
                        ${vars.giftCardBrand} Gift Card
                    </h2>
                    <p style="color: ${vars.textColor}; opacity: 0.6;">
                        In appreciation of ${vars.ctaText.toLowerCase()}
                    </p>
                </div>
            </div>

            <!-- Redemption Form -->
            <div class="max-w-md mx-auto mb-16">
                <form id="giftCardRedemptionForm" class="bg-white rounded-lg shadow-xl p-8 border" style="border-color: ${vars.primaryColor}20;">
                    <h2 class="text-2xl font-bold text-center mb-6" style="color: ${vars.textColor};">
                        Redemption
                    </h2>
                    
                    <label for="codeInput" class="block text-sm font-semibold mb-2" style="color: ${vars.textColor};">
                        Enter Your Code
                    </label>
                    <input
                        type="text"
                        id="codeInput"
                        name="code"
                        placeholder="XXXX-XXXX-XXXX"
                        required
                        class="w-full px-4 py-3 border rounded-lg mb-6 focus:outline-none focus:ring-2"
                        style="border-color: ${vars.primaryColor}30; focus:ring-color: ${vars.primaryColor}50;"
                    />
                    
                    <button
                        type="submit"
                        id="submitButton"
                        class="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                        style="background: ${vars.primaryColor};"
                    >
                        Claim Your Reward
                    </button>
                </form>
            </div>

            <!-- Benefits -->
            <div class="grid md:grid-cols-3 gap-8 text-center">
                <div>
                    <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full" style="background: ${vars.primaryColor}10;">
                        <svg class="w-6 h-6" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 class="font-semibold" style="color: ${vars.textColor};">${vars.benefit1}</h3>
                </div>
                <div>
                    <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full" style="background: ${vars.accentColor}10;">
                        <svg class="w-6 h-6" style="color: ${vars.accentColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 class="font-semibold" style="color: ${vars.textColor};">${vars.benefit2}</h3>
                </div>
                <div>
                    <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full" style="background: ${vars.primaryColor}10;">
                        <svg class="w-6 h-6" style="color: ${vars.primaryColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                    </div>
                    <h3 class="font-semibold" style="color: ${vars.textColor};">${vars.benefit3}</h3>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="border-t mt-16" style="border-color: ${vars.primaryColor}20;">
            <div class="max-w-4xl mx-auto px-6 py-8 text-center text-sm" style="color: ${vars.textColor}; opacity: 0.5;">
                © ${new Date().getFullYear()} ${vars.companyName}. All rights reserved.
            </div>
        </footer>
    </div>
</body>
</html>`
  }
};

export function getTemplateById(id: string): LandingPageTemplate | undefined {
  return Object.values(templates).find(t => t.id === id);
}

export function getAllTemplates(): LandingPageTemplate[] {
  return Object.values(templates);
}
