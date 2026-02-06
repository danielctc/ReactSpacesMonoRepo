import React, { useState } from 'react';
import { FaBars, FaComment } from 'react-icons/fa';

const OptionsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdown">
      <button
        tabIndex={0}
        className="btn btn-ghost text-white bg-black/25 hover:bg-white/25 backdrop-blur-sm rounded-md"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Options"
      >
        <FaBars />
      </button>
      {isOpen && (
        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
          onBlur={() => setIsOpen(false)}
        >
          <li className="menu-title">
            <span>Profile</span>
          </li>
          <li>
            <a>
              <FaComment />
              Settings
            </a>
          </li>
          <li>
            <a>
              <FaComment />
              Log Out
            </a>
          </li>
          <li className="menu-title">
            <span>Another Section</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default OptionsMenu;
