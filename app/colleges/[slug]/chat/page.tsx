import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { COLLEGES, getCollege } from "@/lib/colleges";
import ChatRoom from "@/components/ChatRoom";

export function generateStaticParams() {
  return COLLEGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const college = getCollege(slug);
  return {
    title: `${college?.name} Chat — IIIT Connect`,
    description: `Join the real-time general chat for ${college?.name}. Discuss academics, campus life, and more with fellow students.`,
    openGraph: {
      title: `${college?.name} Chat | IIIT Connect`,
      description: `Live chat room for ${college?.name} students.`,
      type: "website",
    },
  };
}

export default async function ChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/colleges/${slug}`} className="text-sm text-slate-400 hover:text-white">
            ← {college.name}
          </Link>
          <h1 className="text-3xl font-bold">
            {college.name} — <span className="text-indigo">General Chat</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time discussion for verified students. Be respectful.
          </p>
        </div>
      </div>

      <ChatRoom collegeSlug={slug} />
    </div>
  );
}
