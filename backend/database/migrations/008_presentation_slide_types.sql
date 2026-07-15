ALTER TABLE presentation_slides
  MODIFY type ENUM('custom','image','sponsor','upcoming_matches','round_announcement','featured_round') NOT NULL;
