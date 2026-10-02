import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, Calendar, Plus, Check, Edit2, Trash2, Search, Play } from 'lucide-react';
import type { Role, Member } from '../types';
import { getAllRoles, saveRole, deleteRole, getRoleHolder } from '../data/rolesRepo';
import { getAllMembers } from '../data/membersRepo';
import { ConfirmModal } from './ConfirmModal';

export const RolesView: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; label: string } | null>(null);

  // Test getRoleHolder tool state
  const [testRoleKey, setTestRoleKey] = useState<string>('president');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [testResult, setTestResult] = useState<{ role: Role; member?: Member } | null>(null);

  const loadData = async () => {
    try {
      const [allRoles, allMembers] = await Promise.all([getAllRoles(), getAllMembers()]);
      setRoles(allRoles);
      setMembers(allMembers);
      if (allRoles.length > 0 && !testRoleKey) {
        setTestRoleKey(allRoles[0].roleKey);
      }
    } catch (err) {
      console.error('Failed to load roles data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMemberChange = async (roleId: string, memberId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const updated = { ...role, memberId: memberId || undefined };
    await saveRole(updated);
    await loadData();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    await saveRole(editingRole);
    setEditingRole(null);
    await loadData();
  };

  const handleDelete = (id: string, label: string) => {
    setRoleToDelete({ id, label });
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole(roleToDelete.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete role:', err);
    } finally {
      setRoleToDelete(null);
    }
  };

  const handleRunRoleHolderTest = async () => {
    const res = await getRoleHolder(testRoleKey, testDate);
    setTestResult(res);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Leadership Team Roles
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {roles.length} roles
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Map chapter leadership roles, terms, and test deterministic role resolution for slides.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingRole({
              id: `role_${Date.now()}`,
              roleKey: '',
              roleLabel: '',
            })
          }
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Role</span>
        </button>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3">Role Key</th>
                <th className="px-5 py-3">Role Label</th>
                <th className="px-5 py-3">Assigned Member</th>
                <th className="px-5 py-3">Term Duration</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                    {r.roleKey}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{r.roleLabel}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={r.memberId || ''}
                      onChange={(e) => handleMemberChange(r.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 max-w-xs w-full"
                    >
                      <option value="">-- Unassigned --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category || m.company || 'Member'})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                    {r.termStart || r.termEnd ? (
                      <span>
                        {r.termStart || 'Start'} → {r.termEnd || 'Ongoing'}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No term limits set</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => setEditingRole(r)}
                      title="Edit role metadata"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.roleLabel)}
                      title="Delete role"
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
      </div>

      {/* Role Holder Query Tester (Testing getRoleHolder(roleKey, date)) */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4 shadow-sm">
        <div>
          <h3 className="font-semibold text-sm flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Resolver: getRoleHolder(roleKey, date)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test how PPTX slide generation resolves leadership figures on specific meeting dates.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400 mb-1">Select Role</label>
            <select
              value={testRoleKey}
              onChange={(e) => setTestRoleKey(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono text-xs focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r.roleKey} value={r.roleKey}>
                  {r.roleLabel} ({r.roleKey})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400 mb-1">Target Date</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-auto sm:self-end">
            <button
              onClick={handleRunRoleHolderTest}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
            >
              Run Query
            </button>
          </div>
        </div>

        {testResult !== null && (
          <div className="p-3.5 rounded-lg bg-slate-850 border border-slate-800 text-xs">
            {testResult.member ? (
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">Resolved Holder:</span>
                <span className="font-bold text-white text-sm">
                  {testResult.member.title ? `${testResult.member.title} ` : ''}
                  {testResult.member.name}
                </span>
                <span className="text-slate-400">({testResult.member.category})</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  ID: {testResult.member.id}
                </span>
              </div>
            ) : (
              <div className="text-amber-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>No active member assigned to role "{testRoleKey}" on {testDate}.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingRole.roleKey ? 'Edit Role' : 'Create Role'}
              </h3>
              <button
                onClick={() => setEditingRole(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Role Key (used in template tags)
                </label>
                <input
                  type="text"
                  required
                  value={editingRole.roleKey}
                  onChange={(e) =>
                    setEditingRole({
                      ...editingRole,
                      roleKey: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  placeholder="e.g. visitor_host_lead"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Label</label>
                <input
                  type="text"
                  required
                  value={editingRole.roleLabel}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, roleLabel: e.target.value })
                  }
                  placeholder="e.g. Lead Visitor Host"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Member</label>
                <select
                  value={editingRole.memberId || ''}
                  onChange={(e) =>
                    setEditingRole({
                      ...editingRole,
                      memberId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="">-- Unassigned --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Term Start</label>
                  <input
                    type="date"
                    value={editingRole.termStart || ''}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, termStart: e.target.value || undefined })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Term End</label>
                  <input
                    type="date"
                    value={editingRole.termEnd || ''}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, termEnd: e.target.value || undefined })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(roleToDelete)}
        title="Delete Leadership Role?"
        message={`Are you sure you want to permanently delete the role "${roleToDelete?.label}"?`}
        confirmLabel="Delete Role"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRoleToDelete(null)}
      />
    </div>
  );
};
