import Footer from "@/components/footer/Footer";
import HeroScene from "@/components/hero/HeroScene";

export default function Home() {
  return (
    <main className="bg-black">
      <div className=" fixed w-full">
        <video
          className="w-full h-screen object-cover"
          loop
          autoPlay
          muted
          playsInline
          preload="auto"
        >
          <source src="/videos/1920.mp4" type="video/mp4" />
          <source src="/videos/1920.mp4" type="video/ogg" />
          Your browser does not support HTML video.
        </video>
      </div>
      <div className="relative z-10">
        <HeroScene />
        <Footer />
      </div>

    </main>
  );
}
