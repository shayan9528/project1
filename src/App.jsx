import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, Clock3, ExternalLink, MapPin, Search, SlidersHorizontal, X,
} from 'lucide-react';

const JOBS_API = 'https://www.arbeitnow.com/api/job-board-api';
const PAGE_SIZE = 8;
const JobsContext = createContext(null);

function safeSlug(job) {
  return String(job.slug || job.id || `${job.company_name}-${job.title}`)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeJob(job) {
  return {
    ...job,
    slug: safeSlug(job),
    company: job.company_name || job.company || 'Company confidential',
    location: job.remote ? 'Remote' : job.location || 'Location not listed',
    types: Array.isArray(job.job_types) ? job.job_types : job.job_types ? [job.job_types] : [],
    tags: Array.isArray(job.tags) ? job.tags : [],
  };
}

function JobProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fieldwork-saved') || '[]'); }
    catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadJobs() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(JOBS_API);
      if (!response.ok) throw new Error(`Job service returned ${response.status}.`);
      const payload = await response.json();
      const records = Array.isArray(payload) ? payload : payload.data || payload.jobs || [];
      setJobs(records.map(normalizeJob));
    } catch (requestError) {
      setError(requestError.message || 'We could not load jobs right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => {
    localStorage.setItem('fieldwork-saved', JSON.stringify(saved));
  }, [saved]);

  function toggleSaved(slug) {
    setSaved((current) => current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug]);
  }

  return (
    <JobsContext.Provider value={{ jobs, saved, toggleSaved, loading, error, loadJobs }}>
      {children}
    </JobsContext.Provider>
  );
}

function useJobs() {
  return useContext(JobsContext);
}

function Header() {
  const { saved } = useJobs();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Fieldwork home">
          <span className="brand-mark"><BriefcaseBusiness size={19} strokeWidth={2.2} /></span>
          <span>fieldwork<span className="brand-period">.</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/" className="nav-link">Find a job</Link>
          <Link to="/saved" className="nav-link saved-nav">Saved <span>{saved.length}</span></Link>
        </nav>
        <a className="header-action" href="https://www.arbeitnow.com/" target="_blank" rel="noreferrer">
          For employers <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}

function SearchControls({ jobs, onSearch }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const locations = [...new Set(jobs.map((job) => job.location).filter((value) => value && value !== 'Location not listed'))].sort();
  const types = [...new Set(jobs.flatMap((job) => job.types))].sort();
  const categories = [...new Set(jobs.flatMap((job) => job.tags))].sort().slice(0, 40);

  useEffect(() => onSearch({ query, location, type, category }), [query, location, type, category]);

  function clearFilters() {
    setQuery(''); setLocation(''); setType(''); setCategory('');
  }

  return (
    <section className="search-panel" aria-label="Search and filter jobs">
      <div className="search-main">
        <Search size={19} aria-hidden="true" />
        <input
          aria-label="Search jobs, companies, or keywords"
          placeholder="Job title, company, or keyword"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && <button className="clear-search" type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={17} /></button>}
      </div>
      <div className="filter-divider" />
      <label className="filter-field">
        <MapPin size={17} aria-hidden="true" />
        <select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)}>
          <option value="">Anywhere</option>
          {locations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <ChevronDown className="select-chevron" size={14} />
      </label>
      <label className="filter-field">
        <BriefcaseBusiness size={17} aria-hidden="true" />
        <select aria-label="Filter by job type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Any job type</option>
          {types.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <ChevronDown className="select-chevron" size={14} />
      </label>
      <label className="filter-field category-field">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <ChevronDown className="select-chevron" size={14} />
      </label>
      <button className="filter-reset" type="button" onClick={clearFilters}>Clear</button>
    </section>
  );
}

function JobCard({ job }) {
  const { saved, toggleSaved } = useJobs();
  const isSaved = saved.includes(job.slug);
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className="company-avatar" aria-hidden="true">{job.company.charAt(0).toUpperCase()}</div>
        <button
          className={`save-button ${isSaved ? 'is-saved' : ''}`}
          type="button"
          title={isSaved ? 'Remove saved job' : 'Save job'}
          aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          onClick={() => toggleSaved(job.slug)}
        ><Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="job-heading-row">
        <div>
          <Link className="job-title" to={`/jobs/${encodeURIComponent(job.slug)}`}>{job.title}</Link>
          <p className="company-name">{job.company}</p>
        </div>
        <Link className="job-open" to={`/jobs/${encodeURIComponent(job.slug)}`} aria-label={`View ${job.title}`}><ArrowUpRight size={18} /></Link>
      </div>
      <div className="job-meta">
        <span><MapPin size={14} />{job.location}</span>
        {job.types.slice(0, 1).map((item) => <span key={item}><BriefcaseBusiness size={14} />{item}</span>)}
      </div>
      <div className="job-card-footer">
        <span className="posted-date"><Clock3 size={14} />{formatDate(job.created_at)}</span>
        <span className="job-category">{job.tags[0] || 'Open role'}</span>
      </div>
    </article>
  );
}

function formatDate(value) {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function LoadingState() {
  return <div className="loading-grid" aria-label="Loading job listings">{Array.from({ length: 6 }, (_, index) => <div className="loading-card" key={index}><span /><span /><span /></div>)}</div>;
}

function EmptyState({ savedPage }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Search size={21} /></span>
      <h3>{savedPage ? 'Your shortlist is waiting' : 'No roles found'}</h3>
      <p>{savedPage ? 'Save a role that catches your eye and it will be waiting here.' : 'Try a broader search or clear a filter to see more opportunities.'}</p>
      {savedPage && <Link className="text-link" to="/">Explore open roles <ArrowRight size={15} /></Link>}
    </div>
  );
}

function ErrorState({ error, retry }) {
  return <div className="error-state"><div><strong>We hit a snag.</strong><p>{error} Check your connection and try again.</p></div><button className="btn btn-dark btn-sm" type="button" onClick={retry}>Try again</button></div>;
}

function ListingPage({ savedOnly = false }) {
  const { jobs, saved, loading, error, loadJobs } = useJobs();
  const [filters, setFilters] = useState({ query: '', location: '', type: '', category: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const visibleJobs = jobs.filter((job) => {
    if (savedOnly && !saved.includes(job.slug)) return false;
    const searchText = [job.title, job.company, job.location, ...job.tags].join(' ').toLowerCase();
    return (!filters.query || searchText.includes(filters.query.toLowerCase()))
      && (!filters.location || job.location === filters.location)
      && (!filters.type || job.types.some((item) => item.toLowerCase() === filters.type.toLowerCase()))
      && (!filters.category || job.tags.some((item) => item.toLowerCase() === filters.category.toLowerCase()));
  });
  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  const pageJobs = visibleJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [filters, savedOnly]);

  return (
    <main className="container page-shell">
      <section className="page-intro">
        <div>
          <p className="eyebrow"><span /> A better kind of job search</p>
          <h1>{savedOnly ? <>Your <em>shortlist.</em></> : <>Find work that<br className="mobile-break" /> <em>moves you.</em></>}</h1>
          <p className="intro-copy">Thoughtful opportunities from teams building what comes next.</p>
        </div>
        <div className="intro-note"><span className="note-number">01</span><span>Make your next<br />move count.</span></div>
      </section>

      {!savedOnly && <SearchControls jobs={jobs} onSearch={setFilters} />}
      <section className="results-section">
        <div className="results-heading">
          <div><h2>{savedOnly ? 'Saved roles' : 'Open roles'}</h2><p>{loading ? 'Finding your next opportunity…' : `${visibleJobs.length.toLocaleString()} ${visibleJobs.length === 1 ? 'position' : 'positions'} to explore`}</p></div>
          {!savedOnly && !loading && <span className="live-indicator"><span /> Updated live</span>}
        </div>
        {error && jobs.length === 0 ? <ErrorState error={error} retry={loadJobs} /> : loading && jobs.length === 0 ? <LoadingState /> : pageJobs.length === 0 ? <EmptyState savedPage={savedOnly} /> : (
          <>
            <div className="jobs-grid">{pageJobs.map((job) => <JobCard key={job.slug} job={job} />)}</div>
            {pageCount > 1 && <nav className="pagination-row" aria-label="Job results pages">
              <span className="page-count">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visibleJobs.length)} of {visibleJobs.length}</span>
              <div className="pagination-controls">
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><ArrowLeft size={17} /></button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.max(3, currentPage + 2)).map((page) => <button key={page} className={currentPage === page ? 'active' : ''} type="button" onClick={() => setCurrentPage(page)}>{page}</button>)}
                <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}><ArrowRight size={17} /></button>
              </div>
            </nav>}
          </>
        )}
      </section>
      <footer className="site-footer"><span>FIELDWORK / 2026</span><span>Good work starts with a good search.</span><a href="https://www.arbeitnow.com/" target="_blank" rel="noreferrer">Job data by Arbeitnow <ExternalLink size={12} /></a></footer>
    </main>
  );
}

function ApplicationForm({ jobTitle, jobUrl }) {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      setFormError('Please complete each required field with a valid email address.');
      return;
    }
    setFormError('');
    setSubmitted(true);
  }

  if (submitted) return <div className="application-success"><span><Check size={18} /></span><div><h3>Ready to continue</h3><p>This demo does not send or store applications. Continue on the employer’s application page.</p>{jobUrl && <a className="application-link" href={jobUrl} target="_blank" rel="noreferrer">Continue to employer <ExternalLink size={14} /></a>}</div></div>;

  return (
    <form className="application-form needs-validation" noValidate onSubmit={handleSubmit}>
      <div className="form-heading"><div><p className="eyebrow">TAKE THE NEXT STEP</p><h2>Apply for this role</h2></div><span className="form-step">01 / 01</span></div>
      <p className="form-intro">Share a few details to get your application started for <strong>{jobTitle}</strong>.</p>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label" htmlFor="applicant-name">Full name</label><input className="form-control" id="applicant-name" name="name" autoComplete="name" required /><div className="invalid-feedback">Please enter your name.</div></div>
        <div className="col-md-6"><label className="form-label" htmlFor="applicant-email">Email address</label><input className="form-control" id="applicant-email" name="email" type="email" autoComplete="email" required /><div className="invalid-feedback">Enter a valid email address.</div></div>
        <div className="col-12"><label className="form-label" htmlFor="applicant-note">A note to the team</label><textarea className="form-control" id="applicant-note" name="note" rows="4" minLength="20" required placeholder="What makes this role a good fit?" /><div className="invalid-feedback">Add a short note of at least 20 characters.</div></div>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <button className="apply-submit" type="submit">Continue application <ArrowRight size={17} /></button>
      <p className="privacy-note">Your details are not sent or stored by this demo.</p>
    </form>
  );
}

function JobDetailPage() {
  const { slug } = useParams();
  const { jobs, saved, toggleSaved, loading } = useJobs();
  const job = jobs.find((item) => item.slug === slug);
  if (loading && !job) return <main className="container detail-shell"><LoadingState /></main>;
  if (!job) return <main className="container detail-shell"><Link className="back-link" to="/"><ArrowLeft size={16} /> Back to jobs</Link><EmptyState /></main>;

  const description = job.description || '<p>The employer has not provided a detailed description. Visit the original listing for more information.</p>';
  const isSaved = saved.includes(job.slug);
  return (
    <main className="container detail-shell">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> All open roles</Link>
      <section className="detail-hero">
        <div className="detail-company-avatar">{job.company.charAt(0).toUpperCase()}</div>
        <div className="detail-title-block"><p className="eyebrow"><span /> OPEN POSITION</p><h1>{job.title}</h1><p className="detail-company">{job.company} <span>·</span> {job.location}</p></div>
        <button type="button" className={`detail-save ${isSaved ? 'is-saved' : ''}`} onClick={() => toggleSaved(job.slug)}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved' : 'Save role'}</button>
      </section>
      <div className="detail-layout">
        <article className="detail-content">
          <div className="detail-facts">{job.types.map((item) => <span key={item}>{item}</span>)}{job.tags.slice(0, 4).map((item) => <span key={item}>{item}</span>)}<span>{formatDate(job.created_at)}</span></div>
          <h2>About the role</h2>
          <div className="job-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }} />
          {job.url && <a className="original-listing" href={job.url} target="_blank" rel="noreferrer">View original listing <ExternalLink size={15} /></a>}
        </article>
        <aside className="detail-aside"><ApplicationForm jobTitle={job.title} jobUrl={job.url} /><div className="aside-note"><span>FIELD NOTE</span><p>The right next step is the one that feels like yours.</p><span className="note-mark">FW.</span></div></aside>
      </div>
      <footer className="site-footer"><span>FIELDWORK / 2026</span><span>Good work starts with a good search.</span><Link to="/">Back to search <ArrowLeft size={12} /></Link></footer>
    </main>
  );
}

export default function App() {
  return <JobProvider><BrowserRouter><Header /><Routes><Route path="/" element={<ListingPage />} /><Route path="/saved" element={<ListingPage savedOnly />} /><Route path="/jobs/:slug" element={<JobDetailPage />} /><Route path="*" element={<ListingPage />} /></Routes></BrowserRouter></JobProvider>;
}