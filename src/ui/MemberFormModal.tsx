import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, AlertTriangle, Check, User, Image as ImageIcon, Calendar, Phone, Mail, Building, Briefcase } from 'lucide-react';
import type { Member } from '../types';
import { PhotoCropModal } from './PhotoCropModal';
import { checkCardAspect } from '../utils/imageUtils';
import { normalizeMemberName } from '../data/membersRepo';

interface MemberFormModalProps {
  member?: Member | null;
  onSave: (memberData: Member) => Promise<void>;
  onClose: () => void;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  member,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(member?.title || '');
  const [name, setName] = useState(member?.name || '');
  const [category, setCategory] = useState(member?.category || '');
  const [company, setCompany] = useState(member?.company || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [birthday, setBirthday] = useState(member?.birthday || '');
  const [joinedDate, setJoinedDate] = useState(member?.joinedDate || '');
  const [active, setActive] = useState(member ? member.active : true);
  const [notes, setNotes] = useState(member?.notes || '');

  // Photo & Card Blobs
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(member?.photoBlob);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [cardBlob, setCardBlob] = useState<Blob | undefined>(member?.cardBlob);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [cardAspectWarning, setCardAspectWarning] = useState<string | null>(null);

  // Crop tool state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // Initialize previews
  useEffect(() => {
    if (member?.photoBlob) {
      const url = URL.createObjectURL(member.photoBlob);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [member?.photoBlob]);

  useEffect(() => {
    if (member?.cardBlob) {
      const url = URL.createObjectURL(member.cardBlob);
      setCardPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [member?.cardBlob]);

  // Handle Photo selection -> Open crop tool
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setPhotoBlob(croppedBlob);
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPhotoPreview(previewUrl);
    setCropImageSrc(null);
  };

  // Handle Card selection -> check aspect ratio
  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCardBlob(file);
      const previewUrl = URL.createObjectURL(file);
      setCardPreview(previewUrl);

      // Validate 16:9 aspect
      const check = await checkCardAspect(file);
      if (!check.is16x9) {
        setCardAspectWarning(
          `Card ratio is ${check.ratio}:1 (${check.width}×${check.height}px). Presentation cards should ideally be 16:9 (1.78:1) to prevent cropping.`
        );
      } else {
        setCardAspectWarning(null);
      }

      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter the member name.');
      return;
    }

    setIsSaving(true);
    try {
      const id = member?.id || `mem_${normalizeMemberName(name).replace(/\s+/g, '_')}_${Date.now()}`;
      await onSave({
        id,
        title: title.trim() || undefined,
        name: name.trim(),
        category: category.trim(),
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim(),
        birthday: birthday.trim() || undefined,
        joinedDate: joinedDate.trim() || undefined,
        active,
        notes: notes.trim() || undefined,
        photoBlob,
        cardBlob,
        cardFile: member?.cardFile,
        photoFile: member?.photoFile,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save member:', err);
      alert('Failed to save member.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 my-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                {member ? 'Edit Member Profile' : 'Add New Chapter Member'}
              </h3>
              <p className="text-xs text-slate-500">
                BNI Believers Chapter Roster &amp; Presentation Media
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Visual Media Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Photo Upload with Round Frame */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Member Photo (4.31:5 aspect)
                </label>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-red-500/80 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{photoPreview ? 'Change Photo' : 'Upload & Crop Photo'}</span>
                    </button>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Crops to round feature frame (max 900px)
                    </p>
                  </div>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </div>

              {/* Card Upload with 16:9 Frame */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  "Now Presenting" Card (16:9)
                </label>
                <div className="flex items-center space-x-3">
                  <div className="w-24 h-14 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {cardPreview ? (
                      <img src={cardPreview} alt="Card preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => cardInputRef.current?.click()}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{cardPreview ? 'Change Card' : 'Upload 16:9 Card'}</span>
                    </button>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Slide presentation card
                    </p>
                  </div>
                </div>
                <input
                  ref={cardInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCardFileChange}
                  className="hidden"
                />
              </div>

              {/* Card Warning Banner */}
              {cardAspectWarning && (
                <div className="col-span-full p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p>{cardAspectWarning}</p>
                </div>
              )}
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CA / Dr / Adv"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Member full name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Chartered Accountant"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Jain &amp; Associates"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Birthday (DD-MM)
                </label>
                <input
                  type="text"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  placeholder="e.g. 15-08"
                  pattern="^\d{2}-\d{2}$"
                  title="DD-MM e.g. 15-08"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Joined Date
                </label>
                <input
                  type="date"
                  value={joinedDate}
                  onChange={(e) => setJoinedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-5">
                <input
                  type="checkbox"
                  id="activeCheckbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="activeCheckbox" className="font-semibold text-slate-800 cursor-pointer">
                  Active Member
                </label>
              </div>

              <div className="col-span-full">
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional member information..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : member ? 'Update Member' : 'Create Member'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Crop Modal when user uploads photo */}
      {cropImageSrc && (
        <PhotoCropModal
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onClose={() => setCropImageSrc(null)}
        />
      )}
    </>
  );
};
