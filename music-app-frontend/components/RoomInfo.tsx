'use client';

interface RoomInfoProps {
  roomId: string;
  users: string[];
  currentUser: string;
}

export default function RoomInfo({ roomId, users, currentUser }: RoomInfoProps) {
  return (
    <div className="bg-card rounded-lg p-4 shadow-md border border-border">
      <h2 className="text-lg font-semibold mb-2 text-foreground">Room Information</h2>
      
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Room ID:</p>
        <p className="font-mono bg-muted p-2 rounded text-foreground">{roomId}</p>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Users in Room ({users.length}):</p>
        <ul className="space-y-1">
          {users.map((user, index) => (
            <li key={index} className="flex items-center text-foreground">
              <span className="h-2 w-2 rounded-full bg-secondary mr-2"></span>
              <span>{user === currentUser ? `${user} (You)` : user}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}