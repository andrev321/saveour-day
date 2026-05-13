import React from 'react';
import styled from '@emotion/styled';
import { NavLink } from 'react-router-dom';

const Nav = styled.nav`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 22px;
`;

const StyledNavLink = styled(NavLink)`
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  color: var(--text-muted, #6b645c);
  background: #fff;
  border: 1px solid rgba(176, 141, 87, 0.22);
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: rgba(176, 141, 87, 0.45);
    color: var(--gold, #b08d57);
  }

  &.active {
    background: rgba(176, 141, 87, 0.16);
    border-color: rgba(176, 141, 87, 0.45);
    font-weight: 600;
    color: #4a3d2a;
    box-shadow: 0 6px 18px rgba(53, 42, 29, 0.06);
  }
`;

const RouteNav: React.FC = () => {
  return (
    <Nav aria-label="Wybór strony wydarzenia">
      <StyledNavLink to="/slub" end>
        Ślub
      </StyledNavLink>
      <StyledNavLink to="/obiad" end>
        Obiad
      </StyledNavLink>
      <StyledNavLink to="/grill" end>
        Grill
      </StyledNavLink>
    </Nav>
  );
};

export default RouteNav;
