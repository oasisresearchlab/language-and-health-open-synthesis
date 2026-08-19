we want to make it easy for busy doctors and research assistants to review and edit/approve ai extractions from a paper
- for extractions
	- there should be some checklist for reviewing accuracy - like, go through each section, and edit/approve
- edits should then be "git-blamed" and accrue to a user
	- i'm thinking i could use git as the backbone, but this would require github ids for each person. not that hard to set up, but then they'd need to log in
	- so maybe it's too much?
- this provenance is important though

i think it would be great to serve the pdf as a review context so reviewers can see each evidence nodes' grounding in context of the pdf. help me brainstorm on this re: UI

we also need some kind of review checklist - help me brainstorm on this
starting points:
1. has correct grounding figure/table (and/or verify that there isn't one)
	1. if wrong, propose edits - how?
		1. ideally, in context, actually do the area annotation!
2. has correct and complete methods context (ideally we integrate appropriate reporting guidelines if available!)

then we need an interface to review the reviews (can't assume ppl are comfortable with git, and anyway, not sure that is the best interface to review the reviews).

ideally each review is structured by checklist subtask (which we can tune together) + a reviewable diff and free-text note (if desired) + a catch-all review note if needed.

all of this is predicated on reviewing/editing existing extractions.

what is unknown still is how to handle specifying *missing* extractions. could use some help brainstorming this, but at a high level, it makes sense to fit in the human skim first, and associate with list of key results. but we can also try to tune the initial extraction for high recall of relevant result nodes.