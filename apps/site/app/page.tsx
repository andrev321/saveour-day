import * as S from "../components/styles";
import { BrandLogo } from "@invitations/ui/brand";
export default function Home() {
  return (
    <S.GuestCard>
      <BrandLogo animated height={56} />
      <h1>Twoje zaproszenie</h1>
      <p>Otwórz link otrzymany od organizatora.</p>
    </S.GuestCard>
  );
}
