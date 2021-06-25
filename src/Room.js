import React from 'react';
import FaceDetectVideoChat from './FaceDetectVideoChat';

const Room = ({ roomName }) => {
  return (
    <div style={pageStyle}>
      <FaceDetectVideoChat roomName={roomName} />
    </div>
  );
};

const pageStyle = {
  paddingTop: '6rem',
  height: 'calc(100% -6rem)',
  width: '100%',
  overflow: 'scroll',
  display: 'flex',
  justifyContent: 'center',
};
export default Room;
