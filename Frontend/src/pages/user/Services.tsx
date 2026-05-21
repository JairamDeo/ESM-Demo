import { Link } from "react-router-dom";
import { Search, ChevronLeft } from "lucide-react";
import { Icon } from "@iconify/react";
import { title } from "process";

const categories = [
  {
    // icon: <Icon icon="heroicons:user-solid" className="w-5 h-5 text-[white] bg-gradient-to-b from-[#27AAE1] to-[#4B5CFF] rounded-full" />,
    icon: <img src="/icons/user.svg" alt="" className="w-5 h-5" /> ,
    title: "Idenity & personal",
    items: [
      { label: "Update Name",           desc: "As per Pt II Order",          icon: "/icons/updatename.svg"   },
      { label: "Update Aadhaar & PAN",  desc: "Identity document updates",   icon: "/icons/address-card.svg" },
      { label: "Update Mobile & Email", desc: "Contact detail updates",      icon: "/icons/mobile.svg"       },
      { label: "Update Address",        desc: "Residential address changes", icon: "/icons/location.svg"     },
    ],
  },
  {
    icon: <Icon icon="noto:money-bag" className="w-5 h-5 text-info" />,
    title: "Pension & Financial",
    items: [
      { label: "Resolve Pension Issues", desc: "Pension queries & corrections", icon: "/icons/hand.svg"    },
      { label: "Pension Payment Order",  desc: "PPO access & updates",          icon: "/icons/money.svg"   },
      { label: "Monthly Pay Slip",       desc: "Download & view slips",         icon: "/icons/notes.svg"   },
      { label: "Stop FMA",               desc: "Fixed Medical Allowance",       icon: "/icons/medical.svg" },
    ],
  },
  {
    icon: <Icon icon="noto-v1:family" className="w-5 h-5 text-info" />,
    title: "Family Details",
    items: [
      { label: "Add Nominee",           desc: "Nominee registration",       icon: "/icons/person.svg" },
      { label: "Add Family Details",    desc: "Family composition records", icon: "/icons/family.svg"  },
      { label: "Update Spouse Details", desc: "Name, PAN, Aadhaar, Email", icon: "/icons/spouse.svg"  },
      { label: "Update DOB of Spouse",  desc: "Date of birth correction",  icon: "/icons/event.svg"   },
    ],
  },
  {
    icon: <Icon icon="glyphs-poly:check-badge" className="w-5 h-5" />,
    title: "Requests & Tracking",
    items: [
      { label: "Death Intimation",        desc: "ESM & Dependents",          icon: "/icons/document.svg"  },
      { label: "Grievance for Increment", desc: "As per Rank & Service",     icon: "/icons/graph.svg"     },
      { label: "Track Case Status",       desc: "Real-time tracking portal", icon: "/icons/factcheck.svg" },
      { label: "SMS / Portal Alerts",     desc: "Notifications on updates",  icon: "/icons/alert.svg"     },
    ],
  },
];

export default function Services() {
  return (
    <div className="px-2 space-y-3 animate-fade-in ">

      {/* Header */}
      <div className="flex items-center gap-5">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
          <ChevronLeft className="w-5 h-5 " color="#FFFFFF" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Services</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[#222223] rounded-xl px-4 py-3">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search services"
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 w-full"
        />
      </div>

      {/* Categories */}
      {categories.map((cat) => (
        <div key={cat.title} className="rounded-xl bg-[#1B1B1B] p-3 lg:h-[150px] ">
          <div className="flex items-center gap-2 mb-3 lg:gap-4 lg:mb-2  ">
            <span className="text-lg ">{cat.icon}</span>
            <h2 className="font-semibold text-sm text-foreground lg:text-md lg:font-bold">{cat.title}</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {cat.items.map((item) => (
              <Link
                key={item.label}
                to="/user/raise-grievance"
                state={{ caseType: item.label }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-14 h-14 lg:mt-2 lg:w-18 lg:h-18  rounded-sm bg-[#222223] flex items-center justify-center group-hover:border-primary/30 transition-colors">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-[24px] h-[24px] object-contain"
                  />
                </div>
                <span className="text-[10px] lg:text-[12px] text-foreground/80 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}