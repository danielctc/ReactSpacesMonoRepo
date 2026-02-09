import React, { useEffect, useRef, useState, useContext } from 'react';
import { FaCrown, FaStar, FaEllipsisV, FaTrash } from 'react-icons/fa';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

interface ChatMessageProps {
  message: any;
  isCurrentUser: boolean;
  spaceID: string;
  onMessageDelete?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser, spaceID, onMessageDelete }) => {
  const { user } = useContext(UserContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.uid) {
        try {
          const isDisruptiveAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
          setIsAdmin(isDisruptiveAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [user?.uid]);

  // Handle message deletion
  const handleDeleteMessage = async () => {
    if (!spaceID || !message.id) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `spaces/${spaceID}/chatMessages`, message.id));
      console.log('Message deleted successfully');

      // Call callback if provided
      if (onMessageDelete) {
        onMessageDelete(message.id);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;

    return date.toLocaleDateString();
  };

  // Get avatar URL from rpmURL
  const getAvatarUrl = (message: any) => {
    if (message.rpmURL) {
      return message.rpmURL.includes('.glb')
        ? message.rpmURL.replace('.glb', '.png?scene=fullbody-portrait-closeupfront&w=640&q=75')
        : message.rpmURL;
    }
    return null;
  };

  // Get user initials for fallback
  const getUserInitials = (username: string) => {
    if (!username) return '?';
    if (username.startsWith('Visitor_')) {
      const number = username.split('_')[1];
      return `V${number ? number.charAt(0) : ''}`;
    }
    return username.charAt(0).toUpperCase();
  };

  return (
    <div
      className="flex items-start gap-2 px-2 py-1 rounded-md hover:bg-white/5 w-full max-w-full relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar - Small and compact */}
      <div className="avatar flex-shrink-0 mt-0.5">
        <div className="w-6 rounded-full bg-white/30 border border-white/30">
          {getAvatarUrl(message) ? (
            <img src={getAvatarUrl(message)} alt={message.user} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-white">
              {getUserInitials(message.user)}
            </div>
          )}
        </div>
      </div>

      {/* Message Content - Inline style */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white break-words whitespace-pre-wrap leading-tight inline select-text">
          {/* Username with styling */}
          <span className={`font-bold mr-1 ${isCurrentUser ? 'text-blue-300' : 'text-green-300'}`}>
            {message.user}
          </span>

          {/* Role badge inline */}
          {message.role && (
            <span className="mr-1">
              {message.role === 'owner' ? '👑' : message.role === 'host' ? '⭐' : ''}
            </span>
          )}

          {/* Guest badge inline */}
          {message.isGuest && (
            <span className="text-gray-400 text-xs mr-1">
              (Guest)
            </span>
          )}

          {/* Message text flows inline */}
          <span className="text-white">
            {message.text}
          </span>

          {/* Timestamp at the end */}
          <span className="text-xs text-white/50 ml-2 font-normal">
            {formatTime(message.timestamp)}
          </span>
        </p>
      </div>

      {/* Admin Menu - Only show for admins on hover */}
      {isAdmin && isHovered && (
        <div className="absolute top-1 right-1 z-[1000]">
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-ghost btn-xs btn-circle bg-black/60 hover:bg-black/80"
              onClick={() => setShowMenu(!showMenu)}
              disabled={isDeleting}
            >
              {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <FaEllipsisV />}
            </button>
            {showMenu && (
              <ul className="dropdown-content menu bg-black/90 border border-white/20 min-w-[120px] z-[9999] shadow-lg rounded-box p-2">
                <li>
                  <button
                    className="text-red-300 hover:bg-red-900 text-sm"
                    onClick={handleDeleteMessage}
                    disabled={isDeleting}
                  >
                    <FaTrash />
                    Delete Message
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ChatMessageListProps {
  messages?: any[];
  currentUserId?: string;
  isLoading?: boolean;
  spaceID: string;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages = [], currentUserId, isLoading = false, spaceID }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle message deletion callback
  const handleMessageDelete = (messageId: string) => {
    // The message will be automatically removed from the list via the Firebase subscription
  };

  // Auto-scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: messages.length <= 1 ? 'auto' : 'smooth',
          block: 'end'
        });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'end'
      });
    }
  }, []);

  // Group messages by date for better organization
  const groupMessagesByDate = (messages: any[]) => {
    const groups: any[] = [];
    let currentGroup: any = null;

    messages.forEach((message) => {
      const messageDate = message.timestamp?.toDate ?
        message.timestamp.toDate() :
        new Date(message.timestamp);

      const dateString = messageDate.toDateString();

      if (!currentGroup || currentGroup.date !== dateString) {
        currentGroup = {
          date: dateString,
          messages: []
        };
        groups.push(currentGroup);
      }

      // Always show avatar for every message now
      currentGroup.messages.push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-white/60">
        <div className="flex flex-col items-center gap-2">
          <span className="loading loading-spinner loading-sm"></span>
          <p className="text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-white/60 text-center p-4">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs">Be the first to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-full h-full box-border">
      <div className="flex flex-col gap-0 w-full">
        {messageGroups.map((group, groupIndex) => (
          <div key={group.date}>
            {/* Date separator */}
            {groupIndex > 0 && (
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-white/20" />
                <p className="text-xs text-white/60 px-2 bg-black/50 rounded-md">
                  {group.date === new Date().toDateString() ? 'Today' : group.date}
                </p>
                <div className="flex-1 h-px bg-white/20" />
              </div>
            )}

            {/* Messages for this date */}
            {group.messages.map((message: any) => (
              <ChatMessage
                key={message.id}
                message={message}
                isCurrentUser={message.uid === currentUserId}
                spaceID={spaceID}
                onMessageDelete={handleMessageDelete}
              />
            ))}
          </div>
        ))}

        {/* Scroll anchor - completely invisible */}
        <div ref={messagesEndRef} className="h-px w-full" />
      </div>
    </div>
  );
};

export default ChatMessageList;
