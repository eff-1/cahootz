import React from 'react';
import { PRESENCE_STATES, SESSION_STATES } from '../../../../../../packages/shared/src/index';
import { StudyTogetherRoom } from '../../../components/session/StudyTogetherRoom';

export default function StudySessionPage() {
  return (
    <StudyTogetherRoom
      sessionId="demo-session-id"
      courseCode="CSC 301"
      courseTitle="Operating Systems"
      goal="Solve 2023 Past Questions — Deadlocks & Paging"
      partnerName="Zainab M."
      partnerPresence={PRESENCE_STATES.PRESENT}
      state={SESSION_STATES.ACTIVE}
      remainingSeconds={1500}
      plannedDurationMinutes={50}
      onCheckIn={() => {}}
      onSendPing={() => {}}
      onRespondPing={() => {}}
      onPause={() => {}}
      onResume={() => {}}
      onEmergencyExit={() => {}}
      onComplete={() => {}}
      onFileDispute={() => {}}
    />
  );
}
