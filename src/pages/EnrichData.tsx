import { enrichData } from '@/lib/enrich-data';

// Simple page to run data enrichment
export default function EnrichDataPage() {
    const handleEnrich = async () => {
        try {
            await enrichData();
            alert('Data enrichment complete! Refresh the page and select "Summit Roofing & Construction" from the client dropdown.');
        } catch (error) {
            console.error('Error:', error);
            alert('Error enriching data. Check console for details.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
                <h1 className="text-2xl font-bold mb-4">Enrich Demo Data</h1>
                <p className="text-gray-600 mb-6">
                    Click the button below to add realistic demo data to your database:
                </p>
                <ul className="list-disc list-inside mb-6 text-sm text-gray-700">
                    <li>1 Demo Client (Summit Roofing)</li>
                    <li>25 Realistic Contacts</li>
                    <li>Various lifecycle stages</li>
                </ul>
                <button
                    onClick={handleEnrich}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    Enrich Data Now
                </button>
            </div>
        </div>
    );
}
