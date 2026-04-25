import React from 'react';
import PhysicsDots from './PhysicsDots';
import Link from 'next/link';

const Footer = () => {
    const navLinks = [
        ['TAPTOP', 'RESULT', 'FAQ'],
        ['PROGRAM', 'WHO WE ARE', 'CONTACTS'],
        ['PRICE', 'REVIEWS', ''],
    ];
    return (
        <div className='p-6 pt-0'>
            <PhysicsDots />
            <footer
                className="w-full font-mono text-white "
            >

                <div className='backdrop-blur-[50px] bg-white/10'>
                    <div className="flex flex-wrap items-start justify-between px-8 pt-8 pb-6 gap-5 ">

                        <div className="flex flex-col gap-5 min-w-[260px]">
                            <p className="text-base tracking-widest leading-snug uppercase text-white/90 max-w-[320px]">
                                LEARN TO BUILD WEBSITES OF ANY
                                COMPLEXITY ON TAPTOP — FROM ZERO TO PRO
                            </p>

                            <nav>
                                <div className="sm:flex gap-10 ">
                                    {navLinks.map((col, ci) => (
                                        <ul key={ci} className="flex flex-col gap-[6px]">
                                            {col.map((item, i) =>
                                                item ? (
                                                    <li key={i}>
                                                        <Link
                                                            href="#"
                                                            className="flex items-center gap-[6px] text-base tracking-widest uppercase text-white/90 hover:text-white transition-colors"
                                                        >
                                                            <span className="text-base opacity-70">○</span>
                                                            {item}
                                                        </Link>
                                                    </li>
                                                ) : (
                                                    <li key={i} className="h-[19px]" />
                                                )
                                            )}
                                        </ul>
                                    ))}
                                </div>
                            </nav>
                        </div>

                        <div className="flex flex-col gap-5 min-w-[240px] max-w-[340px]">
                            <p className="text-base tracking-widest leading-snug uppercase text-white/90">
                                / HIT THE BUTTON — THREE MONTHS FROM
                                NOW, YOU'LL ALREADY BE IN THE GAME.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    className="px-6 py-2 text-base tracking-widest uppercase font-bold bg-white text-[#1a0a06] hover:bg-white/90 transition-colors"
                                    style={{ letterSpacing: '0.15em' }}
                                >
                                    ENROLL
                                </button>
                                <button
                                    className="w-10 h-10 flex items-center justify-center border border-white/60 hover:border-white text-white transition-colors text-base"
                                    aria-label="More options"
                                >
                                    ⠿
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 sm:text-right sm:min-w-[200px] w-full">
                            <p className="text-base tracking-widest uppercase text-white/90">
                                CHANNEL: @IZUM_STUDY
                            </p>
                            <p className="text-base tracking-widest uppercase text-white/90">
                                FOR QUESTIONS: @DZIMITRY1
                            </p>
                        </div>
                    </div>

                    <div className="sm:flex items-center justify-between px-8 py-4 pt-10 sm:pt-20 border-white/10">
                        <Link
                            href="#"
                            className="text-base tracking-widest uppercase text-white/60 hover:text-white/90 transition-colors"
                        >
                            LEGAL DOCUMENTS
                        </Link>
                        <p className="text-base tracking-widest uppercase text-white/60">
                            DEVELOPMENT BY IZUM.DIGITAL
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Footer;
