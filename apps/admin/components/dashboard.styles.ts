"use client";
import { styled } from "styled-components";
import { Card, Container } from "@mantine/core";
export const Page = styled.div`
  min-height: 100vh;
  background: #f5f7fb;
  color: #242b59;
`;
export const Content = styled(Container)`
  padding-block: 20px 40px;
  @media (max-width: 40em) {
    padding-block: 16px 28px;
  }
`;
export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e7f0;
  @media (max-width: 40em) {
    flex-wrap: wrap;
    gap: 16px;
  }
`;
export const Hero = styled.section`
  margin-block: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  & h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.04em;
    line-height: 1.15;
  }
  @media (max-width: 48em) {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
`;
export const Stats = styled.div`
  display: flex;
  gap: 24px;
  flex-shrink: 0;
  padding: 16px 24px;
  background: #e9edf8;
  border-radius: 20px;
  max-width: 100%;
  @media (max-width: 40em) {
    width: 100%;
    gap: 20px;
    padding: 16px;
    & > div {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }
  & strong {
    display: block;
    font-size: 32px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
`;
export const ProjectCard = styled(Card)`
  border: 1px solid #e1e6ef;
  border-radius: 20px;
  background: white;
  padding: 16px;
  min-width: 0;
  transition:
    box-shadow 0.18s,
    border-color 0.18s;
  &:hover {
    border-color: #aabde5;
    box-shadow: 0 8px 24px #242b590a;
  }
  & h2 {
    overflow-wrap: anywhere;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
export const Monogram = styled.div`
  width: 56px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 20px 20px 5px 5px;
  background: #edf1fa;
  color: #3d518b;
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.05em;
`;
export const Empty = styled.section`
  padding: 36px 20px;
  background: white;
  border: 1px dashed #cbd4e7;
  border-radius: 24px;
  text-align: center;
  & > svg {
    color: #819bcf;
    margin-bottom: 12px;
  }
`;
export const Login = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 40px;
  padding-block: 40px;
  & h1 {
    font-size: clamp(2.4rem, 4vw, 3.6rem);
    letter-spacing: -0.04em;
    line-height: 1.1;
  }
  @media (max-width: 48em) {
    grid-template-columns: 1fr;
    gap: 20px;
    padding-block: 24px;
  }
`;
