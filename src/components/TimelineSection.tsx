import React from 'react';
import styled from '@emotion/styled';
import { Card, SectionTitle } from './layout';

const TimelineList = styled.div`
  display: grid;
  gap: 12px;
`;

const TimelineItem = styled.div`
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: center;
  gap: 14px;
  text-align: left;
  background: rgba(166, 139, 91, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
`;

const TimeTag = styled.span`
  font-weight: 600;
  color: #7c6642;
  font-size: 0.94rem;
`;

const EventText = styled.span`
  color: #4a4a4a;
  font-size: 0.95rem;
  line-height: 1.4;
`;

const TimelineSection: React.FC = () => {
  return (
    <Card>
      <SectionTitle>Plan dnia</SectionTitle>
      <TimelineList>
        <TimelineItem>
          <TimeTag>14:00</TimeTag>
          <EventText>Ceremonia - Parafia Imienia Jezus</EventText>
        </TimelineItem>
        <TimelineItem>
          <TimeTag>16:00</TimeTag>
          <EventText>Poczestunek - Przystan Browarna</EventText>
        </TimelineItem>
      </TimelineList>
    </Card>
  );
};

export default TimelineSection;
