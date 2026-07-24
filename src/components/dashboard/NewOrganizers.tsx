import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { db } from "../../config/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

interface OrganizerRequest {
  id: string;
  name: string;
  image?: string;
  email: string;
}

export const NewOrganizers: React.FC = () => {
  const [requests, setRequests] = useState<OrganizerRequest[]>([]);

  const loadRequests = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const pending: OrganizerRequest[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.status === "Pending" || data.status === "pending") {
          pending.push({
            id: d.id,
            name: data.name || "Unnamed Candidate",
            email: data.email || "",
            image: data.image || ""
          });
        }
      });
      setRequests(pending);
    } catch (e) {
      console.error("Error loading candidate requests:", e);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id: string, action: "accept" | "reject") => {
    try {
      const userRef = doc(db, "users", id);
      if (action === "accept") {
        await setDoc(userRef, { status: "Active" }, { merge: true });
        alert("Registration approved!");
      } else {
        await setDoc(userRef, { status: "Deactivated" }, { merge: true });
        alert("Registration rejected.");
      }
      await loadRequests();
    } catch (err) {
      console.error("Error updating registration action:", err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left flex flex-col justify-between h-full">
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
                  {req.image ? (
                    <img
                      src={req.image}
                      alt={req.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-500">
                      {req.name.split(" ").map(n => n[0]).join("")}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">{req.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{req.email}</p>
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
