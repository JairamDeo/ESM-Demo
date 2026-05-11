import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { useMyGrievances } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

const services = [
  { icon: <img src="/icons/user.svg" alt="" className="w-6 h-6"/>, label: "Identity & Personal" },
  { icon: <Icon icon="noto:money-bag" className="w-6 h-6" />, label: "Pension & Financial" },
  { icon: <Icon icon="noto-v1:family" className="w-6 h-6" />, label: "Family Details" },
  { icon: <Icon icon="glyphs-poly:check-badge" className="w-6 h-6" />, label: "Requests & Tracking" },
];

const progressMap: Record<string, number> = { pending: 20, "in-progress": 60, escalated: 55, resolved: 100 };

export default memo(function UserHome() {
  const { user } = useAuth();
  const { data: complaints = [] } = useMyGrievances();

  const recentComplaint = useMemo(() => complaints[0] || null, [complaints]);
  const progress = recentComplaint ? (progressMap[recentComplaint.status] || 20) : 80;
  const circumference = 201;

  const RecentComplaintBox = () =>(
    <div className="bg-[#232324] rounded-xl p-6 lg:p-7 ">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm lg:text-lg">Recent Complaint</h3>
      </div>
      {recentComplaint ? (
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 text-[11px] text-muted-foreground">
            <p>Complaint ID : {recentComplaint.grievanceId || "PMS/2026-001"}</p>
            <p className="flex items-center gap-1">
              Status :{" "}
              <span className="bg-info/20 text-info px-2 py-0.5 rounded-full font-bold capitalize ml-1">
                {recentComplaint.status || "Inprogress"}
              </span>
            </p>
          </div>
          <div className="relative w-[80px] h-[80px] flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="7" className="text-border" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * circumference} ${circumference - (progress / 100) * circumference}`}
                className="text-info transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
              {progress}%
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs lg:text-md text-muted-foreground">No complaints yet.</p>
      )}
    </div>
  );

  // const RecentComplaintBox = () => {
  // const displayId = recentComplaint?.grievanceId || "PMS/2026-001";
  // const displayStatus = recentComplaint?.status || "In-Progress";
  // const displayProgress = recentComplaint ? progress : 80;

  // return (
  //   <div className="bg-card rounded-xl p-4">
  //     {/* Title */}
  //     <h3 className="font-bold text-sm text-white ">Recent Complaint</h3>

  //     {/* Content Row */}
  //     <div className="flex items-center justify-between">

  //       {/* Left: text info */}
  //       <div className="space-y-3 text-[11px] text-[#cfcfcf]">
  //         <p>Complaint ID : <span className="text-[#cfcfcf]">{displayId}</span></p>
  //         <div className="flex items-center gap-1">
  //           <span>Status :</span>
  //           <span className="bg-[#2A2A2A] text-[#FFBF54] px-2 py-0.5 rounded-sm font-normal capitalize">
  //             {displayStatus}
  //           </span>
  //         </div>
  //       </div>

//         {/* Right: circle progress */}
//         <div className="relative w-[80px] h-[80px] flex-shrink-0">
//           <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
//             <circle
//               cx="40" cy="40" r="32"
//               fill="none" stroke="currentColor" strokeWidth="7"
//               className="text-border"
//             />
//             <circle
//               cx="40" cy="40" r="32"
//               fill="none" stroke="currentColor" strokeWidth="7"
//               strokeLinecap="round"
//               strokeDasharray={`${(displayProgress / 100) * circumference} ${circumference - (displayProgress / 100) * circumference}`}
//               className="text-info transition-all duration-500"
//             />
//           </svg>
//           <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
//             {displayProgress}%
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

  

  return (
    <div className="w-full flex justify-center py-1">
      <div className="w-full max-w-md lg:max-w-5xl px-2 lg:px-0 space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <h1 className="text-lg lg:text-3xl font-semibold text-foreground">
            {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome to Grievance Portal"}
          </h1>
          <p className="text-xs lg:text-sm text-[#c4c2c2] font-normal mt-1">
            Raise and monitor your concerns easily
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-[#222223] rounded-xl px-4 py-3 border border-border">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search complaint, services"
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>

        {/* Hero Banner */}
        <div className="w-full bg-gradient-to-r from-[#193920] via-[#1c1c23] to-[#282857] rounded-2xl p-3 lg:p-6 flex justify-between items-center overflow-hidden min-h-[130px] lg:min-h-[160px]">
          <div className="max-w-[60%] ml-2">
            <h2 className="text-lg lg:text-2xl font-semibold text-white leading-tight mb-3 lg:mb-4">
              All Your Grievance Services in One Place
            </h2>
            <p className="text-[10px] lg:text-sm text-[#ebe9e9]">
              Raise complaints, track status, and get timely updates with ease.
            </p>
          </div>
          <div className="relative w-[100px] lg:w-[180px] flex-shrink-0">
            <img src="./image.svg" alt="illustration" className="scale-125 translate-x-1 object-contain w-full" />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">

          {/* Left: Action Cards */}
          <div className="lg:col-span-2 space-y-5  ">

            <div className="grid grid-cols-2 gap-3 mb-3 ">

              {/* Raise Grievance */}
              <Link
                to="/user/raise-grievance"
                className="relative overflow-hidden bg-[#4438ac] rounded-xl p-4 text-primary-foreground hover:opacity-90 transition-all flex flex-col justify-between group h-[304px] lg:min-h-[340px]"
              >
                <div className="absolute -bottom-14 -right-12 w-40 h-40 border-[20px] border-white/5 rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="bg-[#2222225C] w-10 h-10 rounded-full flex items-center justify-center mb-4 ml-auto">
                    <img src="/icons/pencil.svg" alt="" />
                  </div>
                  <h3 className="font-semibold text-lg lg:text-xl mb-4 leading-tight">
                    Raise <br /> Grievance
                  </h3>
                  <ul className="text-[11px] lg:text-xs space-y-2 mb-6">
                    <li className="flex items-center gap-2">✅ Register Complaint</li>
                    <li className="flex items-center gap-2">✅ Track Status</li>
                    <li className="flex items-center gap-2">✅ Get Resolution</li>
                  </ul>
                </div>
                <div className="relative z-10 h-[32px] bg-white text-[#5B4DDB] mb-17 rounded-sm px-3 flex items-center justify-between font-bold text-sm shadow-lg group-hover:scale-[1.02] transition-transform">
                  Start Now
                  <ArrowRight className="w-4 h-4" color="#000000" />
                </div>
              </Link>

              {/* Right column */}
              <div className="flex flex-col gap-2 ">

                {/* Service Card */}
                <Link
                  to="/user/services"
                  className="relative overflow-hidden bg-[#2196F3] rounded-xl p-4 hover:opacity-90 transition-all group flex flex-col justify-between h-[170px] lg:min-h-[200px]"
                >
                  <div className="absolute -bottom-20 -right-14 w-40 h-40 border-[20px] border-white/10 rounded-full pointer-events-none" />
                  <div className="relative z-10">
                    <div className="bg-[#2222225C] w-10 h-10 rounded-full flex items-center justify-center mb-2 ml-auto">
                      <Icon icon="famicons:folder" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white mt-1">Service</h3>
                      <p className="text-[11px] text-blue-50">View available services</p>
                    </div>
                  </div>
                  <div className="relative z-10 bg-white text-[#2196F3] rounded-sm py-2 px-4 text-center font-bold text-xs mt-3 shadow-lg group-hover:scale-[1.02] transition-transform">
                    View Services
                  </div>
                </Link>

                {/* My Complaints Card */}
                <Link
                  to="/user/complaints"
                  className="relative overflow-hidden bg-[#22946C] rounded-xl p-4 w-[160px] h-[125px] flex flex-col justify-between lg:w-[331px] lg:min-h-[131px]"
                >
                  <div className="absolute -bottom-24 -right-14 w-40 h-40 border-[20px] border-white/10 rounded-full pointer-events-none" />
                  <div className="relative z-10 flex items-start justify-between">
                    <h3 className="text-white text-lg font-semibold leading-6 mt-3">My <br /> Complaints</h3>
                    <div className="w-10 h-10 rounded-full bg-[#2222225C] flex items-center justify-center px-3">
                      <Icon icon="majesticons:note-text" className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="relative z-10 bg-white text-[#22946C] text-xs rounded-sm font-bold py-1.5 mt-2 text-center h-[29px] shadow-lg group-hover:scale-[1.02] transition-transform">
                    View All
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Complaint — mobile only */}
            <div className="lg:hidden">
              <RecentComplaintBox />
            </div>

            {/* ✅ Fast transparent — desktop only, sits below the cards in left column */}
            <div className="hidden lg:block pt-1 ">
              <p className="text-3xl font-bold text-foreground/50 leading-tight">Fast, transparent</p>
              <p className="text-3xl font-bold text-foreground/50 leading-tight">grievance resolution</p>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* Services */}
            <div className="bg-[#232324] rounded-xl p-2 lg:pb-1  ">
              <h3 className="text-base lg:text-lg font-semibold text-white mb-2 mx-3">Services</h3>
              <div className="grid grid-cols-4 gap-3 mb-5 pt-1 ">
                {services.map((s) => (
                  <Link key={s.label} to="/user/services" className="flex flex-col items-center group">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-[#151515] border border-[#676F7B] flex items-center justify-center group-hover:border-gray-400 transition-colors mb-2">
                      <div className="text-xl group-hover:scale-110 transition-transform">
                        {s.icon}
                      </div>
                    </div>
                    <span className="text-[9px] lg:text-[10px] text-[#cecccc] text-center font-normal leading-tight">
                      {s.label}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                to="/user/services"
                className="block w-full py-2 mb-1 bg-[#2A2A2A] text-gray-300 text-center rounded-sm text-sm font-medium hover:bg-[#333] transition-colors"
              >
                View all
              </Link>
            </div>

            {/* ✅ Recent Complaint — desktop only, swapped into sidebar */}
            <div className="hidden lg:block ">
              <RecentComplaintBox />
            </div>

            {/* Fast transparent — mobile only (original position) */}
            <div className="lg:hidden pb-8 ">
              <p className="text-xl font-bold  text-foreground/50 leading-tight">Fast, transparent</p>
              <p className="text-xl font-bold text-foreground/50 leading-tight">grievance resolution</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
});









