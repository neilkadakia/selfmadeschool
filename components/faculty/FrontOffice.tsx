"use client";

// The Front Office: who is in the school, and what they are called.
// Accounts, roles, homerooms, the Extra Credit list, and the quotes that
// go on the homepage.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ROLE_LABEL,
  ROLE_RANK,
  rankOf,
  apiFeedbackList,
  apiFeedbackModerate,
  apiNewsletterList,
  apiSetRole,
  apiUserCreate,
  apiUsersList,
  type Role,
} from "@/lib/api";
import { formatPhone, formatPhoneInput, usDate } from "@/lib/format";
import { roomCreate, roomDelete, roomList, roomMember, type Homeroom, type Tone } from "@/lib/faculty";
import { useLms } from "@/components/useLms";
import { Empty, Panel, Room, Skeleton, Tabs, Tag, useFlash } from "./ui";
import StudentFile from "./StudentFile";

type Person = { email: string; name: string; phone?: string; dob?: string; role: Role; homeroom?: string };
type Sub = { email: string; created: string; source: string };
type Quote = {
  id: string;
  text: string;
  name: string;
  email?: string;
  context: string;
  rating?: number;
  created: string;
  approved: boolean;
};

type Tab = "people" | "homerooms" | "list" | "quotes";

const TONES: Tone[] = ["acc", "vio", "coral", "lime", "pink"];

export default function FrontOffice() {
  const lms = useLms();
  const router = useRouter();
  const token = lms.auth?.token ?? "";
  const myRank = rankOf(lms.auth?.role);
  const { flash, node: flashNode } = useFlash();

  const [tab, setTab] = useState<Tab>("people");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [rooms, setRooms] = useState<Homeroom[] | null>(null);
  const [unplaced, setUnplaced] = useState<{ email: string; name: string }[]>([]);
  const [roomsOn, setRoomsOn] = useState(false);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  // New account
  const [nFirst, setNFirst] = useState("");
  const [nLast, setNLast] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nPass, setNPass] = useState("");
  const [nRole, setNRole] = useState<Role>("student");

  // New homeroom
  const [hName, setHName] = useState("");
  const [hBlurb, setHBlurb] = useState("");
  const [hColor, setHColor] = useState<Tone>("acc");

  const loadPeople = useCallback(() => {
    if (!token) return;
    void apiUsersList(token).then((r) => {
      if (r.ok) setPeople(r.data.users as Person[]);
    });
  }, [token]);

  const loadRooms = useCallback(() => {
    if (!token) return;
    void roomList(token).then((r) => {
      if (r.ok) {
        setRooms(r.data.homerooms as Homeroom[]);
        setUnplaced(r.data.unplaced as { email: string; name: string }[]);
        setRoomsOn(Boolean(r.data.enabled));
      }
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadPeople();
    loadRooms();
    void apiNewsletterList(token).then((r) => {
      if (r.ok) setSubs(r.data.subscribers as Sub[]);
    });
    void apiFeedbackList(token).then((r) => {
      if (r.ok) setQuotes(r.data.quotes as Quote[]);
    });
  }, [token, loadPeople, loadRooms]);

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    const r = await apiUserCreate(token, {
      email: nEmail.trim(),
      password: nPass,
      first: nFirst.trim(),
      last: nLast.trim(),
      phone: nPhone.trim(),
      role: nRole,
    });
    if (r.ok) {
      flash(`${ROLE_LABEL[nRole]} account created for ${nEmail.trim()}.`);
      setNFirst("");
      setNLast("");
      setNEmail("");
      setNPhone("");
      setNPass("");
      setNRole("student");
      loadPeople();
      loadRooms();
    } else {
      flash((r.data.error as string) ?? "Could not create the account.");
    }
  };

  return (
    <Room
      kicker="Faculty Lounge"
      title="Front Office"
      sub="Accounts, roles, homerooms, and the lists the school keeps."
      actions={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { id: "people", label: "People", count: people?.length },
            { id: "homerooms", label: "Homerooms", count: rooms?.length },
            { id: "list", label: "Extra Credit", count: subs?.length },
            { id: "quotes", label: "Quotes", count: quotes?.length },
          ]}
        />
      }
    >
      {tab === "people" && (
        <>
          <Panel
            title="Everybody"
            sub="Invites are manual while the school is in closed session. Act As opens somebody else's classroom, with a banner to keep you honest, and everything you do lands on their account."
            flush
          >
            {!people ? (
              <div style={{ padding: 20 }}>
                <Skeleton rows={4} />
              </div>
            ) : (
              <div className="fac-table">
                <div
                  className="fac-tr fac-tr--head"
                  style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1fr) 150px 90px" }}
                >
                  <span>Name</span>
                  <span>Email</span>
                  <span>Telephone</span>
                  <span>Role</span>
                  <span />
                </div>
                {people.map((p) => (
                  <div
                    key={p.email}
                    className="fac-tr"
                    style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1fr) 150px 90px" }}
                  >
                    <button className="fac-who" onClick={() => setOpen(p.email)}>
                      {p.name || p.email}
                    </button>
                    <span className="fac-muted" data-k="Email" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.email}
                    </span>
                    <span className="fac-muted" data-k="Telephone">
                      {formatPhone(p.phone ?? "") || "·"}
                    </span>
                    <span data-k="Role">
                      {myRank >= ROLE_RANK.global_admin && p.role !== "global_admin" && p.email !== lms.auth?.email ? (
                        <select
                          className="fac-select"
                          value={p.role}
                          aria-label={`Role for ${p.email}`}
                          onChange={async (e) => {
                            const role = e.target.value as Role;
                            const r = await apiSetRole(token, p.email, role);
                            if (r.ok) {
                              flash(`${p.email} is now ${ROLE_LABEL[role]}.`);
                              loadPeople();
                            } else {
                              flash((r.data.error as string) ?? "Could not change the role.");
                            }
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="educator">Educator</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <Tag tone={p.role === "global_admin" ? "coral" : p.role === "admin" ? "vio" : undefined}>
                          {ROLE_LABEL[p.role] ?? p.role}
                        </Tag>
                      )}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {myRank > rankOf(p.role) && p.email !== lms.auth?.email && (
                        <button
                          className="fac-btn fac-btn--sm fac-btn--quiet"
                          onClick={async () => {
                            const r = await lms.actAs(p.email);
                            if (r.ok) router.push("/learn");
                            else flash(r.error ?? "Could not act as that account.");
                          }}
                        >
                          Act As
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Add somebody" sub="They can fill in the rest of their Student File themselves.">
            <form onSubmit={createAccount}>
              <div className="fac-row">
                <label className="fac-field">
                  <span className="fac-label">First name</span>
                  <input className="fac-input" required maxLength={40} value={nFirst} onChange={(e) => setNFirst(e.target.value)} />
                </label>
                <label className="fac-field">
                  <span className="fac-label">Last name</span>
                  <input className="fac-input" required maxLength={40} value={nLast} onChange={(e) => setNLast(e.target.value)} />
                </label>
              </div>
              <div className="fac-row">
                <label className="fac-field">
                  <span className="fac-label">Email</span>
                  <input className="fac-input" type="email" required value={nEmail} onChange={(e) => setNEmail(e.target.value)} />
                </label>
                <label className="fac-field">
                  <span className="fac-label">Telephone</span>
                  <input
                    className="fac-input"
                    type="tel"
                    maxLength={24}
                    value={nPhone}
                    onChange={(e) => setNPhone(formatPhoneInput(e.target.value))}
                  />
                </label>
              </div>
              <div className="fac-row">
                <label className="fac-field">
                  <span className="fac-label">Password</span>
                  <input
                    className="fac-input"
                    type="text"
                    required
                    minLength={10}
                    placeholder="10 characters or more"
                    value={nPass}
                    onChange={(e) => setNPass(e.target.value)}
                  />
                </label>
                <label className="fac-field">
                  <span className="fac-label">Role</span>
                  <select className="fac-select" value={nRole} onChange={(e) => setNRole(e.target.value as Role)}>
                    <option value="student">Student</option>
                    <option value="educator">Educator</option>
                    {myRank >= ROLE_RANK.global_admin && <option value="admin">Administrator</option>}
                  </select>
                </label>
              </div>
              <button className="fac-btn fac-btn--go" type="submit">
                Create the Account
              </button>
            </form>
          </Panel>
        </>
      )}

      {tab === "homerooms" && (
        <>
          {!roomsOn && (
            <Panel title="Homerooms are switched off">
              <p className="fac-panel-sub">
                You can build them here either way. Until the switch is on in School Ops, a homeroom does
                nothing: the Gradebook will not filter by it and the Bulletin will not target it.
              </p>
            </Panel>
          )}

          <Panel title="Start a homeroom">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await roomCreate(token, hName.trim(), hBlurb.trim(), hColor);
                if (r.ok) {
                  setHName("");
                  setHBlurb("");
                  loadRooms();
                  flash("Homeroom opened.");
                } else {
                  flash((r.data.error as string) ?? "Could not create that.");
                }
              }}
            >
              <div className="fac-row">
                <label className="fac-field">
                  <span className="fac-label">Name</span>
                  <input
                    className="fac-input"
                    required
                    maxLength={40}
                    placeholder="March Cohort"
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                  />
                </label>
                <label className="fac-field">
                  <span className="fac-label">Color</span>
                  <select className="fac-select" value={hColor} onChange={(e) => setHColor(e.target.value as Tone)}>
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="fac-field">
                <span className="fac-label">One line about it</span>
                <input
                  className="fac-input"
                  maxLength={160}
                  placeholder="Started together, finishing together."
                  value={hBlurb}
                  onChange={(e) => setHBlurb(e.target.value)}
                />
              </label>
              <button className="fac-btn fac-btn--go" type="submit" disabled={hName.trim().length === 0}>
                Open It
              </button>
            </form>
          </Panel>

          {rooms?.map((r) => (
            <Panel
              key={r.id}
              title={r.name}
              count={r.count}
              countTone="quiet"
              sub={r.blurb}
              actions={
                myRank >= ROLE_RANK.admin && (
                  <button
                    className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                    onClick={async () => {
                      await roomDelete(token, r.id);
                      loadRooms();
                      flash(`${r.name} closed. Nobody lost anything but the label.`);
                    }}
                  >
                    Close the Room
                  </button>
                )
              }
            >
              {r.members.length === 0 ? (
                <p className="fac-hint">Nobody in here yet. Add somebody from the list below.</p>
              ) : (
                <div className="fac-head-actions" style={{ marginBottom: 14 }}>
                  {r.members.map((m) => (
                    <button
                      key={m.email}
                      className="fac-btn fac-btn--sm"
                      onClick={async () => {
                        await roomMember(token, r.id, m.email, false);
                        loadRooms();
                      }}
                      title="Take them out"
                    >
                      {m.name} ✕
                    </button>
                  ))}
                </div>
              )}
              {unplaced.length > 0 && (
                <>
                  <span className="fac-label">Add somebody</span>
                  <select
                    className="fac-select"
                    value=""
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await roomMember(token, r.id, e.target.value, true);
                      loadRooms();
                    }}
                  >
                    <option value="">Choose a student…</option>
                    {unplaced.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </Panel>
          ))}

          {rooms && rooms.length > 0 && unplaced.length > 0 && (
            <p className="fac-hint">
              Not in any homeroom yet: {unplaced.map((u) => u.name).join(", ")}. Everybody gets exactly one
              room, so adding somebody moves them.
            </p>
          )}
        </>
      )}

      {tab === "list" && (
        <Panel
          title="Extra Credit list"
          count={subs?.length}
          countTone="quiet"
          sub="People who asked to hear from the school."
          actions={
            subs && subs.length > 0 ? (
              <button
                className="fac-btn fac-btn--sm"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(subs.map((s) => s.email).join(", "))
                    .then(() => flash("Emails copied."))
                }
              >
                Copy All Emails
              </button>
            ) : null
          }
          flush
        >
          {!subs ? (
            <div style={{ padding: 20 }}>
              <Skeleton rows={3} />
            </div>
          ) : subs.length === 0 ? (
            <Empty title="Nobody on the list yet." />
          ) : (
            <div className="fac-table">
              {subs.map((s) => (
                <div key={s.email} className="fac-tr" style={{ gridTemplateColumns: "minmax(0,2fr) 1fr 1fr" }}>
                  <span>{s.email}</span>
                  <span className="fac-muted" data-k="From">
                    {s.source}
                  </span>
                  <span className="fac-dimmer" data-k="Joined">
                    {usDate(s.created)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "quotes" && (
        <Panel
          title="Student quotes"
          count={quotes?.length}
          countTone="quiet"
          sub="Approved quotes appear on the homepage with the student's first name."
          flush
        >
          {!quotes ? (
            <div style={{ padding: 20 }}>
              <Skeleton rows={3} />
            </div>
          ) : quotes.length === 0 ? (
            <Empty title="Nobody has sent one in yet." />
          ) : (
            quotes.map((q) => (
              <article key={q.id} className="fac-item">
                <div className="fac-item-top">
                  <span style={{ fontWeight: 700 }}>{q.name}</span>
                  {q.approved && <Tag tone="acc">Live on the homepage</Tag>}
                  {(q.rating ?? 0) > 0 && <span className="fac-where">{"★".repeat(q.rating!)}</span>}
                  <span className="fac-when">{usDate(q.created)}</span>
                </div>
                <p className="fac-said">{q.text}</p>
                <div className="fac-item-actions">
                  <button
                    className={`fac-btn fac-btn--sm${q.approved ? "" : " fac-btn--go"}`}
                    onClick={async () => {
                      const action = q.approved ? "unapprove" : "approve";
                      const r = await apiFeedbackModerate(token, q.id, action);
                      if (r.ok) {
                        setQuotes((prev) => prev!.map((x) => (x.id === q.id ? { ...x, approved: !q.approved } : x)));
                        flash(action === "approve" ? "Live on the homepage." : "Taken down.");
                      }
                    }}
                  >
                    {q.approved ? "Take Down" : "Approve"}
                  </button>
                  <button
                    className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                    onClick={async () => {
                      const r = await apiFeedbackModerate(token, q.id, "delete");
                      if (r.ok) {
                        setQuotes((prev) => prev!.filter((x) => x.id !== q.id));
                        flash("Deleted.");
                      }
                    }}
                  >
                    Delete
                  </button>
                  <span className="fac-hint">{q.context}</span>
                </div>
              </article>
            ))
          )}
        </Panel>
      )}

      {open && <StudentFile email={open} onClose={() => setOpen(null)} onChange={loadPeople} flash={flash} />}
      {flashNode}
    </Room>
  );
}
