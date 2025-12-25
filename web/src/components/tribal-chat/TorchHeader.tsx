import { Flame, Users } from 'lucide-react';

interface TorchHeaderProps {
  title: string;
  subtitle: string;
  onlineCount: number;
}

export function TorchHeader({ title, subtitle, onlineCount }: TorchHeaderProps) {
  return (
    <div className="torch-header">
      {/* Left torch */}
      <div className="torch torch-left">
        <div className="torch-flames">
          <span className="flame flame-1">🔥</span>
          <span className="flame flame-2">🔥</span>
          <span className="flame flame-3">🔥</span>
        </div>
        <div className="torch-pole">╿╿╿</div>
      </div>

      {/* Title */}
      <div className="torch-title-container">
        <h2 className="torch-title">{title}</h2>
        <p className="torch-subtitle">{subtitle}</p>
        <div className="torch-online">
          <Users size={12} />
          <span>{onlineCount} torch{onlineCount !== 1 ? 'es' : ''} lit</span>
        </div>
      </div>

      {/* Right torch */}
      <div className="torch torch-right">
        <div className="torch-flames">
          <span className="flame flame-1">🔥</span>
          <span className="flame flame-2">🔥</span>
          <span className="flame flame-3">🔥</span>
        </div>
        <div className="torch-pole">╿╿╿</div>
      </div>
    </div>
  );
}
