import React, { useState } from "react";
import { Check, X } from "lucide-react";
import kenjiImg from "../../assets/images/kenji.png";
import riyaImg from "../../assets/images/riya.png";

interface OrganizerRequest {
  id: string;
  name: string;
  department: string;
  image: string;
}

export const NewOrganizers: React.FC = () => {
  const [requests, setRequests] = useState<OrganizerRequest[]>([
    {
      id: "1",
      name: "Alex Johnson",
      department: "Computer Science",
      image: kenjiImg
    },
    {
      id: "2",
      name: "Elena Rodriguez",
      department: "Data Science Dept.",
      image: riyaImg
    }
  ]);

  const handleAction = (id: string, action: "accept" | "reject") => {
    // Dynamically filter out the handled request
    setRequests(prev => prev.filter(req => req.id !== id));
    console.log(`Organizer request ${id} was ${action}ed`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-left flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">New Organizers</h3>
          <button
            onClick={() => alert("Redirecting to all requests...")}
            className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 transition-colors"
          >
            See All
          </button>
        </div>

        <div className="space-y-4 pt-3.5">
          {requests.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-6 font-medium">
              No pending registrations
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={req.image}
                    alt={req.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">{req.name}</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{req.department}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Accept Button */}
                  <button
                    onClick={() => handleAction(req.id, "accept")}
                    className="w-8 h-8 rounded-lg bg-[#E6F9F0] text-[#10B981] hover:bg-[#10B981] hover:text-white transition-all flex items-center justify-center border border-[#B3F3D2]/30 shadow-sm"
                    aria-label={`Accept ${req.name}`}
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                  </button>
                  
                  {/* Reject Button */}
                  <button
                    onClick={() => handleAction(req.id, "reject")}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center border border-red-100/30 shadow-sm"
                    aria-label={`Reject ${req.name}`}
                  >
                    <X className="h-4 w-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewOrganizers;
