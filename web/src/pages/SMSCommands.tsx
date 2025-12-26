import { Link } from 'react-router-dom';
import { MessageSquare, Phone, CheckCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function SMSCommands() {
  const commands = [
    {
      command: 'PICK [name]',
      example: 'PICK Boston Rob',
      description: "Submit your weekly pick. Use the castaway's first name or full name.",
    },
    {
      command: 'STATUS',
      example: 'STATUS',
      description: 'Check your current pick status, deadline, and points for the week.',
    },
    {
      command: 'TEAM',
      example: 'TEAM',
      description: "View your current roster and each castaway's status.",
    },
    {
      command: 'SCORES',
      example: 'SCORES',
      description: 'Get your latest scores and league standings.',
    },
    {
      command: 'HELP',
      example: 'HELP',
      description: 'Get a list of available commands.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-burgundy-500" />
              SMS Commands
            </h1>
            <p className="text-neutral-500">Make picks and check status via text</p>
          </div>
        </div>

        {/* Phone Number */}
        <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Phone className="h-6 w-6 text-burgundy-500" />
            <h2 className="text-lg font-display font-bold text-neutral-800">Text Us</h2>
          </div>
          <p className="text-3xl font-mono font-bold text-burgundy-500 mb-2">(918) 213-3311</p>
          <p className="text-neutral-600 text-sm">
            Save this number to your contacts for easy access during episodes!
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">Setup</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-burgundy-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <p className="text-neutral-600">
                Go to your{' '}
                <Link
                  to="/profile"
                  className="text-burgundy-500 hover:text-burgundy-600 font-medium"
                >
                  Profile
                </Link>{' '}
                and add your phone number.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-burgundy-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <p className="text-neutral-600">Verify your phone with the code we text you.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-burgundy-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <p className="text-neutral-600">
                Start texting commands to make picks and check status!
              </p>
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">
            Available Commands
          </h2>
          <div className="space-y-4">
            {commands.map((cmd) => (
              <div key={cmd.command} className="bg-cream-50 rounded-xl p-4 border border-cream-200">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-burgundy-500 font-mono font-bold">{cmd.command}</code>
                </div>
                <p className="text-neutral-600 text-sm mb-2">{cmd.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-400">Example:</span>
                  <code className="text-neutral-800 bg-cream-100 px-2 py-1 rounded">
                    {cmd.example}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-white rounded-2xl shadow-card p-6 border border-cream-200">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">Tips</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-neutral-600">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              Commands are not case-sensitive (PICK = pick = Pick)
            </li>
            <li className="flex items-start gap-2 text-neutral-600">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              You can use first name only if it's unique
            </li>
            <li className="flex items-start gap-2 text-neutral-600">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              We'll confirm your pick with a reply text
            </li>
            <li className="flex items-start gap-2 text-neutral-600">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              Picks lock at 3pm PST on Wednesdays
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
