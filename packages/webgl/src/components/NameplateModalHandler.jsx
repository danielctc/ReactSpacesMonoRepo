import React from 'react';
import { useUnityOnNameplateClick } from '../hooks/unityEvents/useUnityOnNameplateClick';
import NameplateModal from './NameplateModal';

function NameplateModalHandler() {
  const [nameplateData, resetNameplateData] = useUnityOnNameplateClick();

  const handleCloseModal = () => {
    resetNameplateData();
  };

  return (
    <>
      {nameplateData && (
        <NameplateModal
          isOpen={!!nameplateData}
          onClose={handleCloseModal}
          playerName={nameplateData.playerName}
          playerId={nameplateData.playerId}
          uid={nameplateData.uid}
        />
      )}
    </>
  );
}

export default NameplateModalHandler; 