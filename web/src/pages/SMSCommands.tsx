import { Link } from 'react-router-dom';
import { MessageSquare, Phone, CheckCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

export default function SMSCommands() {
  const { getCopy } = useSiteCopy();
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
              <EditableText copyKey="sms.header.title" as="span">
                {getCopy('sms.header.title', 'SMS Commands')}
              </EditableText>
            </h1>
            <EditableText copyKey="sms.header.subtitle" as="p" className="text-neutral-500">
              {getCopy('sms.header.subtitle', 'Make picks and check status via text')}
            </EditableText>
          </div>
        </div>

        {/* Phone Number */}
        <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Phone className="h-6 w-6 text-burgundy-500" />
            <EditableText copyKey="sms.phone.title" as="h2" className="text-lg font-display font-bold text-neutral-800">
              {getCopy('sms.phone.title', 'Text Us')}
            </EditableText>
          </div>
          <a
            href="sms:+14247227529"
            className="text-3xl font-mono font-bold text-burgundy-500 mb-2 block hover:text-burgundy-600 transition-colors"
          >
            (424) 722-7529
          </a>
          <EditableText copyKey="sms.phone.save" as="p" className="text-neutral-600 text-sm mb-4">
            {getCopy('sms.phone.save', 'Save this number to your contacts for easy access during episodes!')}
          </EditableText>
          <EditableText copyKey="sms.phone.description" as="p" className="text-neutral-600 text-sm font-medium">
            {getCopy('sms.phone.description', 'Make weekly picks and check the leaderboard with just a simple text command.')}
          </EditableText>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
          <EditableText copyKey="sms.setup.title" as="h2" className="text-lg font-display font-bold text-neutral-800 mb-4">
            {getCopy('sms.setup.title', 'Setup')}
          </EditableText>
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
          <EditableText copyKey="sms.commands.title" as="h2" className="text-lg font-display font-bold text-neutral-800 mb-4">
            {getCopy('sms.commands.title', 'Available Commands')}
          </EditableText>
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

        {/* Weekly Pick Reminder Feature */}
        <div className="mt-6 bg-gradient-to-r from-burgundy-50 to-amber-50 rounded-2xl shadow-card p-6 border border-burgundy-200">
          <EditableText copyKey="sms.reminders.title" as="h2" className="text-lg font-display font-bold text-neutral-800 mb-3">
            {getCopy('sms.reminders.title', 'Weekly Pick Reminders')}
          </EditableText>
          <EditableText copyKey="sms.reminders.description" as="p" className="text-neutral-700 mb-4">
            {getCopy('sms.reminders.description', 'We can text everyone each week asking who their weekly pick is. All you have to do is text 1 or 2 to confirm your pick for that week!')}
          </EditableText>
          <EditableText copyKey="sms.reminders.details" as="p" className="text-neutral-600 text-sm">
            {getCopy('sms.reminders.details', 'This feature makes it super easy to make your picks without even opening the app. Just reply with the number of your castaway (1 for your first pick, 2 for your second pick).')}
          </EditableText>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-white rounded-2xl shadow-card p-6 border border-cream-200">
          <EditableText copyKey="sms.tips.title" as="h2" className="text-lg font-display font-bold text-neutral-800 mb-4">
            {getCopy('sms.tips.title', 'Tips')}
          </EditableText>
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

      <Footer />
    </div>
  );
}
