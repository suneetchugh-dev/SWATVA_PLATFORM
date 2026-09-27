import React, { useState, useEffect } from 'react';
import { api, getToken } from '../api/client';

export default function ProfileSection() {
  const token = getToken();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [age, setAge] = useState('');
  const [income, setIncome] = useState('');
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Lucknow');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [gender, setGender] = useState('FEMALE');
  const [disabilityStatus, setDisabilityStatus] = useState('NO');
  const [familyMembers, setFamilyMembers] = useState([]);

  // Family member input
  const [newMember, setNewMember] = useState({
    fullName: '',
    relationship: 'SPOUSE',
    age: '',
    gender: 'MALE',
    annualIncome: '',
    occupation: '',
  });

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.user.getMe();
      setProfile(data);
      if (data && data.profile) {
        const p = data.profile;
        setAge(p.age ?? '');
        setIncome(p.income ?? '');
        setState(p.state || 'Uttar Pradesh');
        setDistrict(p.district || '');
        setOccupation(p.occupation || '');
        setEducation(p.education || '');
        setCategory(p.category || 'GENERAL');
        setGender(p.gender || 'FEMALE');
        setDisabilityStatus(p.disabilityStatus || 'NO');
        setFamilyMembers(p.familyMembers || []);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccessMsg('');

    const payload = {
      age: age ? parseInt(age, 10) : null,
      income: income ? parseFloat(income) : null,
      state: state || null,
      district: district || null,
      occupation: occupation || null,
      education: education || null,
      category: category || null,
      gender: gender || null,
      disabilityStatus: disabilityStatus || null,
      familyMembers: familyMembers.length > 0 ? familyMembers.map(m => ({
        fullName: m.fullName,
        relationship: m.relationship,
        age: m.age ? parseInt(m.age, 10) : null,
        gender: m.gender,
        annualIncome: m.annualIncome ? parseFloat(m.annualIncome) : null,
        occupation: m.occupation || null,
      })) : [],
    };

    try {
      const updated = await api.user.updateProfile(payload);
      setProfile(updated);
      setSuccessMsg('Profile updated successfully in backend database!');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const addFamilyMember = () => {
    if (!newMember.fullName.trim()) return;
    setFamilyMembers([...familyMembers, { ...newMember }]);
    setNewMember({
      fullName: '',
      relationship: 'SPOUSE',
      age: '',
      gender: 'MALE',
      annualIncome: '',
      occupation: '',
    });
  };

  const removeFamilyMember = (index) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  if (!token) {
    return (
      <div className="card">
        <div className="card-title">User Profile</div>
        <div className="alert alert-info">Please log in first from the Authentication tab to view or update your profile.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>User Profile & Demographics</span>
        <button className="btn btn-secondary btn-sm" onClick={loadProfile} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Profile'}
        </button>
      </div>
      <p className="card-subtitle">
        Update your citizen profile below. The deterministic eligibility engine and benefit calculators evaluate these attributes.
      </p>

      {error && (
        <div className="alert alert-danger">
          <strong>Error ({error.code || 'FAILED'}):</strong> {error.message}
          {error.fieldErrors && (
            <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
              {Object.entries(error.fieldErrors).map(([field, msg]) => (
                <li key={field}><strong>{field}:</strong> {msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <form onSubmit={handleSave}>
        <div className="grid-3">
          <div className="form-group">
            <label>Age (Years)</label>
            <input
              type="number"
              min="0"
              max="130"
              placeholder="e.g. 28"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Annual Family Income (₹)</label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="e.g. 180000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>State</label>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi">Delhi</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Bihar">Bihar</option>
            </select>
          </div>

          <div className="form-group">
            <label>District</label>
            <input
              type="text"
              placeholder="e.g. Lucknow / Varanasi / Gorakhpur"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Occupation</label>
            <select value={occupation} onChange={(e) => setOccupation(e.target.value)}>
              <option value="">-- Select Occupation --</option>
              <option value="FARMER">FARMER</option>
              <option value="ARTISAN">ARTISAN / CRAFTSPERSON</option>
              <option value="AGRICULTURAL_WORKER">AGRICULTURAL WORKER</option>
              <option value="STUDENT">STUDENT</option>
              <option value="UNEMPLOYED">UNEMPLOYED</option>
              <option value="ENTREPRENEUR">ENTREPRENEUR / SELF-EMPLOYED</option>
              <option value="SALARIED">SALARIED PRIVATE</option>
              <option value="GOVERNMENT">GOVERNMENT EMPLOYEE</option>
            </select>
          </div>

          <div className="form-group">
            <label>Education Level</label>
            <select value={education} onChange={(e) => setEducation(e.target.value)}>
              <option value="">-- Select Education --</option>
              <option value="PRIMARY">PRIMARY (Class 1-5)</option>
              <option value="MIDDLE_SCHOOL">MIDDLE SCHOOL (Class 8)</option>
              <option value="SECONDARY">SECONDARY (Class 10)</option>
              <option value="HIGHER_SECONDARY">HIGHER SECONDARY (Class 12)</option>
              <option value="DIPLOMA">DIPLOMA / ITI</option>
              <option value="GRADUATE">GRADUATE</option>
              <option value="POST_GRADUATE">POST GRADUATE</option>
            </select>
          </div>

          <div className="form-group">
            <label>Social Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="GENERAL">GENERAL</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="FEMALE">FEMALE</option>
              <option value="MALE">MALE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="form-group">
            <label>Disability Status (≥40%)</label>
            <select value={disabilityStatus} onChange={(e) => setDisabilityStatus(e.target.value)}>
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </div>
        </div>

        {/* Family Members section */}
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <label style={{ fontSize: '14px', marginBottom: '8px' }}>Family Members ({familyMembers.length})</label>

          {familyMembers.length > 0 && (
            <div className="table-container" style={{ marginBottom: '14px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Income (₹)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {familyMembers.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.fullName}</td>
                      <td>{m.relationship}</td>
                      <td>{m.age ?? '-'}</td>
                      <td>{m.gender ?? '-'}</td>
                      <td>{m.annualIncome ? `₹${m.annualIncome}` : '-'}</td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeFamilyMember(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid-3" style={{ background: '#FAFAFA', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Member Full Name"
              value={newMember.fullName}
              onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
            />
            <select
              value={newMember.relationship}
              onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
            >
              <option value="SPOUSE">SPOUSE</option>
              <option value="CHILD">CHILD / DAUGHTER / SON</option>
              <option value="PARENT">PARENT / MOTHER / FATHER</option>
              <option value="SIBLING">SIBLING</option>
              <option value="OTHER">OTHER</option>
            </select>
            <input
              type="number"
              placeholder="Age"
              value={newMember.age}
              onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addFamilyMember}>
              + Add Family Member
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving Profile...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
}
