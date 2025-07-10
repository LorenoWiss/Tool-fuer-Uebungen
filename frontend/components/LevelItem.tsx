import React from 'react';

interface Level {
  id: string;
  name: string;
  parentId: string | null; // parentId is part of the original flat structure
  children: Level[];
}

interface LevelItemProps {
  level: Level;
}

const LevelItem: React.FC<LevelItemProps> = ({ level }) => {
  return (
    <li key={level.id} className="mt-2">
      <span className="font-medium text-gray-800">{level.name}</span>
      {level.children && level.children.length > 0 && (
        <ul className="pl-6 mt-1 border-l-2 border-gray-200">
          {level.children.map((child) => (
            <LevelItem key={child.id} level={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default LevelItem;
