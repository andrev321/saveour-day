"use client";
import { createGlobalStyle, styled } from "styled-components";
export const SiteGlobalStyles = createGlobalStyle`body {margin: 0;
background: #faf7f1;
color: #34322d;
font-family: Inter, sans-serif;}
`;

export const GuestCard = styled.main.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-card",
})`
  & {
    max-width: 680px;
    margin: 40px auto;
    padding: 28px;
    background: white;
    border: 1px solid #e5dfd3;
    border-radius: 18px;
  }
  & h1 {
    font-family: "Playfair Display", Georgia, serif;
  }
  & h2 {
    font-family: "Playfair Display", Georgia, serif;
  }
  & label {
    display: block;
    margin: 14px 0;
  }
  & input {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    margin-top: 6px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
  }
  & textarea {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    margin-top: 6px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
  }
  & select {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    margin-top: 6px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
  }
  & button {
    display: inline-block;
    margin: 8px 8px 8px 0;
    padding: 12px 20px;
    background: #6c501b;
    color: white;
    border: 0;
    border-radius: 24px;
    font: inherit;
    cursor: pointer;
  }
  & button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  & fieldset {
    border: 1px solid #ddd;
    margin: 18px 0;
    border-radius: 10px;
  }
  & :focus-visible {
    outline: 3px solid #6c501b;
    outline-offset: 3px;
  }
  @media (max-width: 720px) {
    & {
      margin: 16px;
      padding: 20px;
    }
  }
`;

export const GuestLink = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-link",
})`
  ${GuestCard} & {
    display: inline-block;
    margin: 8px 8px 8px 0;
    padding: 12px 20px;
    background: #6c501b;
    color: white;
    border: 0;
    border-radius: 24px;
    font: inherit;
    cursor: pointer;
  }
`;
