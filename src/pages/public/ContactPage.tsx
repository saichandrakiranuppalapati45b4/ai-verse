import React from "react";
import SEO from "../../components/layout/SEO";

const ContactPage: React.FC = () => {
  return (
    <div className="py-20 text-center container mx-auto px-4">
      <SEO 
        title="Contact - Get in Touch" 
        description="Get in touch with the AI Verse team for collaboration, inquiries, or support."
        keywords="Contact AI Verse, Support, Collaboration"
      />
      <h1 className="text-4xl font-bold">Contact Us</h1>
      <p className="mt-4 text-slate-600">Send us a message or find our location.</p>
    </div>
  );
};

export default ContactPage;
