'use client';

interface RoomInfoProps {
  roomId: string;
  users: string[];
  currentUser: string;
}

export default function RoomInfo({ roomId, users, currentUser }: RoomInfoProps) {
  return (
    <div className="bg-white rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-2">Room Information</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">Room ID:</p>
        <p className="font-mono bg-gray-100 p-2 rounded">{roomId}</p>
      </div>
      
      <div>
        <p className="text-sm text-gray-600 mb-2">Users in Room ({users.length}):</p>
        <ul className="space-y-1">
          {users.map((user, index) => (
            <li key={index} className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              <span>{user === currentUser ? `${user} (You)` : user}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}