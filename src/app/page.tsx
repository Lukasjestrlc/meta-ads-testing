import HomepagePixel from "@/components/HomepagePixel";
import QuizFunnel from "@/components/QuizFunnel";

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <HomepagePixel />
      <QuizFunnel />
    </>
  );
}
