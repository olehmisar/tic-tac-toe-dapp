import styled from 'styled-components';

export const Container = styled.div`
  margin-left: auto;
  margin-right: auto;

  width: 1140px;

  @media only screen and (max-width: 1200px) {
    width: 960px;
  }

  @media only screen and (max-width: 992px) {
    width: 720px;
  }

  @media only screen and (max-width: 768px) {
    width: 540px;
  }

  @media only screen and (max-width: 576px) {
    width: 100%;
  }
`;
