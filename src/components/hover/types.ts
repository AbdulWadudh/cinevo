export interface PreviewCastMember {
	id: number;
	name: string;
	character: string;
	profilePath: string | null;
}

export interface TitlePreview {
	overview: string;
	genres: string[];
	certification: string;
	runtime: string;
	cast: PreviewCastMember[];
}

export interface PersonKnownFor {
	id: number;
	mediaType: "movie" | "tv";
	title: string;
	posterPath: string | null;
	year: string;
}

export interface PersonPreview {
	biography: string;
	birthday: string | null;
	deathday: string | null;
	placeOfBirth: string | null;
	knownForDepartment: string | null;
	knownFor: PersonKnownFor[];
}
