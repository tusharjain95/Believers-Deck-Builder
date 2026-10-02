import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileArchive,
  User,
  Image as ImageIcon,
  Building,
  Phone,
  Mail,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { Member } from '../types';
import {
  getAllMembers,
  saveMember,
  toggleMemberActive,
  deleteMember,
  seedDemoMembers,
} from '../data/membersRepo';
import { MemberFormModal } from './MemberFormModal';
import { ImportWorkbookModal } from './ImportWorkbookModal';
import { ImportAssetsZipModal } from './ImportAssetsZipModal';
import { ConfirmModal } from './ConfirmModal';

interface MemberRowThumbnailProps {
  member: Member;
}

const MemberRowThumbnail: React.FC<MemberRowThumbnailProps> = ({ member }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  useEffect(() => {
    let pUrl: string | null = null;
    let cUrl: string | null = null;

    if (member.photoBlob) {
      pUrl = URL.createObjectURL(member.photoBlob);
      setPhotoUrl(pUrl);
    } else {
      setPhotoUrl(null);
    }

    if (member.cardBlob) {
      cUrl = URL.createObjectURL(member.cardBlob);
      setCardUrl(cUrl);
    } else {
      setCardUrl(null);
    }

    return () => {
      if (pUrl) URL.revokeObjectURL(pUrl);
      if (cUrl) URL.revokeObjectURL(cUrl);
    };
  }, [member.photoBlob, member.cardBlob]);

  return (
    <div className="flex items-center space-x-3">
      {/* 16:9 Card Thumbnail */}
      <div className="w-16 h-9 rounded bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
        {cardUrl ? (
          <img src={cardUrl} alt="Card" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {/* Round Photo */}
      <div className="w-9 h-9 rounded-full bg-slate-200 border border-red-500/80 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
        {photoUrl ? (
          <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-slate-400" />
        )}
      </div>
    </div>
  );
};

export const MembersView: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null | undefined>(undefined);
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [showImportAssets, setShowImportAssets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const list = await getAllMembers();
      setMembers(list);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        m.phone.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && m.active) ||
        (statusFilter === 'inactive' && !m.active);

      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const handleSaveMember = async (memberData: Member) => {
    await saveMember(memberData);
    await loadMembers();
  };

  const handleToggleActive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleMemberActive(id);
    await loadMembers();
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMemberToDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await deleteMember(memberToDelete.id);
      await loadMembers();
    } catch (err) {
      console.error('Failed to delete member:', err);
    } finally {
      setMemberToDelete(null);
    }
  };

  const activeCount = members.filter((m) => m.active).length;
  const inactiveCount = members.length - activeCount;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Chapter Members &amp; Presenters
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {members.length} members
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage profiles, round slide photos (4.31:5), and 16:9 "Now Presenting" feature cards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportExcel(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => setShowImportAssets(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <FileArchive className="w-3.5 h-3.5 text-purple-600" />
            <span>Import Assets ZIP</span>
          </button>

          <button
            onClick={() => setSelectedMember(null)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Filter:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full font-medium transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-full font-medium transition ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 rounded-full font-medium transition ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member, category, company..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-4">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <div>
              <p className="text-sm font-semibold text-slate-700">No members found</p>
              <p className="text-xs text-slate-500 mt-1">
                Add your first member or import directly from <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">BNI_Believers_Field_Inventory.xlsx</code>.
              </p>
            </div>
            <div>
              <button
                onClick={async () => {
                  await seedDemoMembers();
                  await loadMembers();
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold transition"
              >
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>Load Sample BNI Believers Members</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Card &amp; Photo</th>
                  <th className="px-5 py-3">Member Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <MemberRowThumbnail member={m} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                        {m.title && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                            {m.title}
                          </span>
                        )}
                        <span>{m.name}</span>
                      </div>
                      {m.birthday && (
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span>Birthday: {m.birthday}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-medium">{m.category}</td>
                    <td className="px-5 py-3 text-slate-600">{m.company}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                      <div>{m.phone}</div>
                      <div className="text-slate-400">{m.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      {m.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right space-x-1">
                      <button
                        onClick={(e) => handleToggleActive(m.id, e)}
                        title={m.active ? 'Deactivate member' : 'Reactivate member'}
                        className={`p-1.5 rounded-lg transition ${
                          m.active
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {m.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(m);
                        }}
                        title="Edit member"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(m.id, m.name, e)}
                        title="Delete member"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Form Modal */}
      {selectedMember !== undefined && (
        <MemberFormModal
          member={selectedMember}
          onSave={handleSaveMember}
          onClose={() => setSelectedMember(undefined)}
        />
      )}

      {/* Excel Import Modal */}
      {showImportExcel && (
        <ImportWorkbookModal
          onSuccess={loadMembers}
          onClose={() => setShowImportExcel(false)}
        />
      )}

      {/* Assets ZIP Import Modal */}
      {showImportAssets && (
        <ImportAssetsZipModal
          onSuccess={loadMembers}
          onClose={() => setShowImportAssets(false)}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(memberToDelete)}
        title="Delete Chapter Member?"
        message={`Are you sure you want to permanently delete member "${memberToDelete?.name}"? All associated card and portrait images will also be removed.`}
        confirmLabel="Delete Member"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setMemberToDelete(null)}
      />
    </div>
  );
};
