import React from "react";
import styled from "@emotion/styled";
import type { TimelineItem as TimelineEntry } from "../types/wedding";
import { Card } from "./layout";

const TimelineRoot = styled.div`
  position: relative;
  padding-left: 8px;
`;

const Rail = styled.div`
  position: absolute;
  left: 21px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: linear-gradient(
    to bottom,
    var(--gold, #b08d57),
    rgba(176, 141, 87, 0.25)
  );
  border-radius: 2px;
`;

const Items = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const Item = styled.li`
  position: relative;
  padding-left: 40px;
  text-align: left;
`;

const Ring = styled.span`
  position: absolute;
  left: 6px;
  top: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--gold, #b08d57);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(176, 141, 87, 0.12);
`;

const TimeTag = styled.span`
  display: block;
  font-family: var(--font-sans, "Inter", sans-serif);
  font-weight: 600;
  font-size: 15px;
  color: var(--gold, #b08d57);
  margin-bottom: 4px;
`;

const EventText = styled.span`
  display: block;
  font-family: var(--font-serif, "Georgia", serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--text, #3f3a34);
  line-height: 1.35;
`;

const EventLink = styled.a`
  display: block;
  font-family: var(--font-serif, "Georgia", serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--text, #3f3a34);
  line-height: 1.35;
`;

type TimelineSectionProps = {
  items: TimelineEntry[];
};

const TimelineSection: React.FC<TimelineSectionProps> = ({ items }) => {
  return (
    <Card>
      <TimelineRoot>
        <Rail aria-hidden />
        <Items>
          {items.map((item) => (
            <Item key={`${item.time}-${item.label}`}>
              <Ring aria-hidden />
              <TimeTag>{item.time}</TimeTag>
              {item.url ? (
                <EventLink href={item.url}>{item.label}</EventLink>
              ) : (
                <EventText>{item.label}</EventText>
              )}
            </Item>
          ))}
        </Items>
      </TimelineRoot>
    </Card>
  );
};

export default TimelineSection;
